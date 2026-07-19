import { StatusCodes } from 'http-status-codes'
import { isValidObjectId, Types } from 'mongoose'
import {
  ReportModel,
  REPORT_STATUSES,
  REPORT_TARGET_TYPES,
  REPORT_TYPES,
  ReportStatus,
  ReportTargetType,
  ReportType,
} from '../models/reports/Report'
import { BID_STATUSES, LOAD_STATUSES, USER_ROLES } from '../models/enums'
import { BidModel } from '../models/loads/Bid'
import { LoadModel } from '../models/loads/Load'
import { UserModel } from '../models/users/User'
import { ApiError } from '../utils/ApiError'

const assertValidId = (id: string, label: string) => {
  if (!isValidObjectId(id)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, `Invalid ${label}`)
  }
}

export type ReportCollaborator = {
  _id: string
  name: string
  email: string
}

type CollaboratorRow = { _id: Types.ObjectId; name: string; email: string }

const USER_LOOKUP_STAGES = [
  { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
  { $unwind: '$user' },
  { $project: { name: '$user.name', email: '$user.email' } },
]

const ASSIGNED_LOAD_STATUSES = [
  LOAD_STATUSES.Booked,
  LOAD_STATUSES.InTransit,
  LOAD_STATUSES.Completed,
]

export const getReportableCollaborators = async (
  userId: string
): Promise<ReportCollaborator[]> => {
  assertValidId(userId, 'userId')

  const uid = new Types.ObjectId(userId)

  const me = await UserModel.findById(uid).select('role')
  if (!me) return []

  const userRole = (me as any).role as string

  let rows: CollaboratorRow[] = []

  if (userRole === USER_ROLES.DRIVER) {
    // Companies whose loads the driver won (accepted bid)
    const acceptedBidCompanies = await BidModel.aggregate<CollaboratorRow>([
      { $match: { driverId: uid, status: BID_STATUSES.Accepted } },
      { $lookup: { from: 'loads', localField: 'loadId', foreignField: '_id', as: 'load' } },
      { $unwind: '$load' },
      { $group: { _id: '$load.companyId' } },
      ...USER_LOOKUP_STAGES,
    ])

    // Companies the driver hauled (or is hauling) for
    const assignedLoadCompanies = await LoadModel.aggregate<CollaboratorRow>([
      { $match: { assignedDriverId: uid, status: { $in: ASSIGNED_LOAD_STATUSES } } },
      { $group: { _id: '$companyId' } },
      ...USER_LOOKUP_STAGES,
    ])

    rows = [...acceptedBidCompanies, ...assignedLoadCompanies]
  }

  if (userRole === USER_ROLES.COMPANY) {
    // Drivers whose bids the company accepted — filter loads by companyId
    // (indexed) before joining to bids, rather than scanning every accepted
    // bid on the platform
    const acceptedBidDrivers = await LoadModel.aggregate<CollaboratorRow>([
      { $match: { companyId: uid } },
      { $lookup: { from: 'bids', localField: '_id', foreignField: 'loadId', as: 'bid' } },
      { $unwind: '$bid' },
      { $match: { 'bid.status': BID_STATUSES.Accepted } },
      { $group: { _id: '$bid.driverId' } },
      ...USER_LOOKUP_STAGES,
    ])

    // Drivers assigned to the company's loads
    const assignedLoadDrivers = await LoadModel.aggregate<CollaboratorRow>([
      {
        $match: {
          companyId: uid,
          assignedDriverId: { $ne: null },
          status: { $in: ASSIGNED_LOAD_STATUSES },
        },
      },
      { $group: { _id: '$assignedDriverId' } },
      ...USER_LOOKUP_STAGES,
    ])

    rows = [...acceptedBidDrivers, ...assignedLoadDrivers]
  }

  const seen = new Set<string>()
  const results: ReportCollaborator[] = []
  for (const row of rows) {
    if (!row._id) continue
    const sid = row._id.toString()
    if (sid === userId || seen.has(sid)) continue
    seen.add(sid)
    results.push({ _id: sid, name: row.name, email: row.email })
  }
  return results
}

export type ReportableLoad = {
  _id: string
  originAddress: string
  destinationAddress: string
  commodity: string
  status: string
}

/**
 * Loads a driver has actually collaborated on — an accepted bid, or an
 * assigned (booked / in-transit / completed) load. Same bar as
 * getReportableCollaborators: a merely submitted bid doesn't count. Includes
 * companyId so resolveDriverInaccurateTarget can reuse this single query
 * instead of a second lookup by id.
 */
const findReportableLoadDocs = async (driverId: string) => {
  assertValidId(driverId, 'driverId')

  const did = new Types.ObjectId(driverId)
  const acceptedBidLoadIds = await BidModel.distinct('loadId', {
    driverId: did,
    status: BID_STATUSES.Accepted,
  })

  return LoadModel.find(
    {
      $or: [
        { _id: { $in: acceptedBidLoadIds } },
        { assignedDriverId: did, status: { $in: ASSIGNED_LOAD_STATUSES } },
      ],
    },
    { originAddress: 1, destinationAddress: 1, commodity: 1, status: 1, companyId: 1 }
  ).sort({ createdAt: -1 })
}

/**
 * These are the only valid inaccurate-report targets; the report page's
 * load picker is fed from the same list.
 */
export const getReportableLoads = async (driverId: string): Promise<ReportableLoad[]> => {
  const loads = await findReportableLoadDocs(driverId)

  return loads.map((load) => ({
    _id: load._id.toString(),
    originAddress: load.originAddress,
    destinationAddress: load.destinationAddress,
    commodity: load.commodity,
    status: load.status,
  }))
}

type CreateReportInput = {
  reporterId: string
  type: ReportType
  targetType: ReportTargetType
  targetName?: string
  targetEmail?: string
  category: string
  description: string
}

type ResolvedTarget = { targetName: string; targetId: Types.ObjectId | null }

/**
 * DRIVER + FRAUD, COMPANY + FRAUD, COMPANY + INACCURATE — target must be a
 * registered user the reporter has actually worked with, identified by
 * email. targetName/targetId are derived from the matched collaborator,
 * never from client input. A miss 404s without revealing whether the email
 * exists on the platform at all. (The one combination NOT covered here is
 * DRIVER + INACCURATE, which targets a load instead — see
 * resolveDriverInaccurateTarget.)
 */
const resolveCollaboratorTarget = async (
  reporterId: string,
  targetType: ReportTargetType,
  targetEmail: string | undefined
): Promise<ResolvedTarget> => {
  const email = targetEmail?.trim().toLowerCase()
  if (!email) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'targetEmail is required')
  }

  const collaborators = await getReportableCollaborators(reporterId)
  const target = collaborators.find((u) => u.email.toLowerCase() === email)
  if (!target) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      `No ${targetType} you have worked with matches that email`
    )
  }

  return { targetName: target.name, targetId: new Types.ObjectId(target._id) }
}

/**
 * DRIVER + INACCURATE — target is a load the driver has actually worked
 * with (same set as getReportableLoads), referenced by its full 24-character
 * id. 404 if the id isn't in that set, whether because it doesn't exist or
 * belongs to a load the driver never touched. The reported party is the
 * company that posted the load. targetName is stored as a human-readable
 * route rather than the raw id, since it's rendered as-is on the reporter's
 * "my reports" list.
 */
const resolveDriverInaccurateTarget = async (
  reporterId: string,
  targetName: string | undefined
): Promise<ResolvedTarget> => {
  const loadId = targetName?.trim() ?? ''
  if (!loadId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'targetName is required')
  }

  const reportableLoads = await findReportableLoadDocs(reporterId)
  const load = reportableLoads.find((l) => l._id.toString() === loadId)
  if (!load) {
    throw new ApiError(StatusCodes.NOT_FOUND, `No load found with ID "${loadId}"`)
  }

  return {
    targetName: `${load.originAddress} → ${load.destinationAddress}`,
    targetId: load.companyId ?? null,
  }
}

const resolveReportTarget = (
  reporterRole: string,
  data: CreateReportInput
): Promise<ResolvedTarget> => {
  if (data.type === REPORT_TYPES.INACCURATE && reporterRole === USER_ROLES.DRIVER) {
    return resolveDriverInaccurateTarget(data.reporterId, data.targetName)
  }
  return resolveCollaboratorTarget(data.reporterId, data.targetType, data.targetEmail)
}

/**
 * Create a report. Target validation depends on who's reporting whom about
 * what — see resolveCollaboratorTarget / resolveDriverInaccurateTarget for
 * the four (role, type) combinations. Every combination requires the target
 * to resolve to a real user or load; none of them accept an unresolved target.
 */
export const createReport = async (data: CreateReportInput) => {
  assertValidId(data.reporterId, 'reporterId')

  if (![REPORT_TYPES.FRAUD, REPORT_TYPES.INACCURATE].includes(data.type)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'type must be "fraud" or "inaccurate"')
  }

  if (![REPORT_TARGET_TYPES.DRIVER, REPORT_TARGET_TYPES.COMPANY].includes(data.targetType)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'targetType must be "driver" or "company"')
  }

  if (!data.category?.trim() || !data.description?.trim()) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'category and description are required')
  }

  const reporter = await UserModel.findById(data.reporterId).select('role')
  if (!reporter) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Reporter not found')
  }

  // Drivers report companies, companies report drivers — never their own role
  const reporterRole = (reporter as any).role as string
  if (reporterRole === USER_ROLES.DRIVER && data.targetType !== REPORT_TARGET_TYPES.COMPANY) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Drivers can only report companies')
  }
  if (reporterRole === USER_ROLES.COMPANY && data.targetType !== REPORT_TARGET_TYPES.DRIVER) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Companies can only report drivers')
  }

  const { targetName, targetId } = await resolveReportTarget(reporterRole, data)

  return ReportModel.create({
    reporterId: new Types.ObjectId(data.reporterId),
    type: data.type,
    targetType: data.targetType,
    targetName,
    targetId,
    category: data.category.trim(),
    description: data.description.trim(),
  })
}

/**
 * Fetch all reports submitted by a user, newest first.
 */
export const getReportsByReporter = async (reporterId: string) => {
  assertValidId(reporterId, 'reporterId')

  return ReportModel.find({ reporterId: new Types.ObjectId(reporterId) }).sort({ createdAt: -1 })
}

/**
 * Fetch all reports (admin view), newest first, with reporter populated.
 */
export const getAllReports = async (options?: { status?: ReportStatus }) => {
  const filter = options?.status ? { status: options.status } : {}

  return ReportModel.find(filter)
    .sort({ createdAt: -1 })
    .populate('reporterId', 'name email role')
    .populate('targetId', 'name email role')
}

/**
 * Update a report's status (admin action).
 */
export const updateReportStatus = async (
  reportId: string,
  status: ReportStatus,
  adminId?: string
) => {
  assertValidId(reportId, 'reportId')

  const validStatuses = Object.values(REPORT_STATUSES) as string[]
  if (!validStatuses.includes(status)) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `status must be one of: ${validStatuses.join(', ')}`
    )
  }

  const report = await ReportModel.findByIdAndUpdate(
    reportId,
    {
      status,
      resolvedByAdminId: adminId && isValidObjectId(adminId) ? new Types.ObjectId(adminId) : null,
    },
    { new: true }
  )

  if (!report) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Report not found')
  }

  return report
}
