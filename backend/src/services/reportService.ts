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
import { UserModel } from '../models/users/User'
import { ApiError } from '../utils/ApiError'

const assertValidId = (id: string, label: string) => {
  if (!isValidObjectId(id)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, `Invalid ${label}`)
  }
}

/**
 * Create a report. targetName is free text — when it matches a registered
 * user of the right role, targetId is resolved so admins can cross-reference.
 */
export const createReport = async (data: {
  reporterId: string
  type: ReportType
  targetType: ReportTargetType
  targetName: string
  category: string
  description: string
}) => {
  assertValidId(data.reporterId, 'reporterId')

  if (![REPORT_TYPES.FRAUD, REPORT_TYPES.INACCURATE].includes(data.type)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'type must be "fraud" or "inaccurate"')
  }

  if (![REPORT_TARGET_TYPES.DRIVER, REPORT_TARGET_TYPES.COMPANY].includes(data.targetType)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'targetType must be "driver" or "company"')
  }

  const targetName = data.targetName?.trim()
  if (!targetName || !data.category?.trim() || !data.description?.trim()) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'targetName, category, and description are required'
    )
  }

  // Best-effort resolution of the target to a registered user
  const target = await UserModel.findOne({
    name: { $regex: `^${targetName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
    role: data.targetType,
  })

  return ReportModel.create({
    reporterId: new Types.ObjectId(data.reporterId),
    type: data.type,
    targetType: data.targetType,
    targetName,
    targetId: target?._id ?? null,
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
