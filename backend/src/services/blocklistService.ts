import { StatusCodes } from 'http-status-codes'
import { isValidObjectId, Types } from 'mongoose'
import { BlocklistModel, TARGET_TYPES, TargetType } from '../models/blocklist/Blocklist'
import { UserModel } from '../models/users/User'
import { BidModel } from '../models/loads/Bid'
import { LoadModel } from '../models/loads/Load'
import { LOAD_STATUSES, BID_STATUSES, USER_ROLES } from '../models/enums'
import { ApiError } from '../utils/ApiError'

const assertValidId = (id: string, label: string) => {
  if (!isValidObjectId(id)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, `Invalid ${label}`)
  }
}

/**
 * True if either user has actively blocked the other (checks both
 * directions, since a block is stored as a single directional row).
 */
export const isBlockedPair = async (userAId: string, userBId: string): Promise<boolean> => {
  if (!isValidObjectId(userAId) || !isValidObjectId(userBId)) return false

  const a = new Types.ObjectId(userAId)
  const b = new Types.ObjectId(userBId)

  const block = await BlocklistModel.exists({
    isActive: true,
    $or: [
      { userId: a, targetId: b },
      { userId: b, targetId: a },
    ],
  })

  return block !== null
}

/**
 * Fetch all active blocklist entries for a user, with the target's
 * name populated for display.
 */
export const getBlocklistForUser = async (userId: string) => {
  assertValidId(userId, 'userId')

  return BlocklistModel.find({ userId: new Types.ObjectId(userId), isActive: true })
    .sort({ blockedAt: -1 })
    .populate('targetId', 'name email role')
}

/**
 * Block a user by name. The target must be a registered user with the
 * expected role — drivers block companies, companies block drivers.
 */
export const blockUserByName = async (data: {
  userId: string
  targetName: string
  targetType: TargetType
  reason?: string
}) => {
  assertValidId(data.userId, 'userId')

  const targetName = data.targetName?.trim()
  if (!targetName) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'targetName is required')
  }

  if (![TARGET_TYPES.DRIVER, TARGET_TYPES.COMPANY].includes(data.targetType)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'targetType must be "driver" or "company"')
  }

  // Resolve the free-text name to a registered user (case-insensitive exact match)
  const target = await UserModel.findOne({
    name: { $regex: `^${targetName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
    role: data.targetType,
  })

  if (!target) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      `No registered ${data.targetType} found with the name "${targetName}"`
    )
  }

  if (target._id.toString() === data.userId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Cannot block yourself')
  }

  const existing = await BlocklistModel.findOne({
    userId: new Types.ObjectId(data.userId),
    targetId: target._id,
  })

  if (existing) {
    if (existing.isActive) {
      throw new ApiError(StatusCodes.CONFLICT, `${target.name} is already blocked`)
    }
    // Re-activate a previously unblocked entry (unique index prevents a new doc)
    existing.isActive = true
    existing.reason = data.reason ?? ''
    existing.blockedAt = new Date()
    await existing.save()
    return existing.populate('targetId', 'name email role')
  }

  const entry = await BlocklistModel.create({
    userId: new Types.ObjectId(data.userId),
    targetId: target._id,
    targetType: data.targetType,
    reason: data.reason ?? '',
  })

  return entry.populate('targetId', 'name email role')
}

/**
 * Fetch users that the current user already has a documented business
 * relationship with — drivers who bid on the company's loads, or companies
 * with loads the driver bid on / was assigned to / completed.
 * These are surfaced in the blocklist dropdown as a convenience so users can
 * quickly block someone they've already interacted with, without needing to
 * remember an exact name. Already-blocked and self-users are excluded.
 */
export const getKnownUsersForBlocklist = async (userId: string) => {
  assertValidId(userId, 'userId')

  const uid = new Types.ObjectId(userId)

  const me = await UserModel.findById(uid).select('role')
  if (!me) return []

  const userRole = (me as any).role as string

  const activeBlocks = await BlocklistModel.find(
    { userId: uid, isActive: true },
    { targetId: 1 }
  ).lean()
  const blockedIds = new Set(
    (activeBlocks as Array<{ targetId: Types.ObjectId }>).map((b) => b.targetId.toString())
  )

  const seen = new Set<string>()
  const results: { _id: string; name: string; email: string; interactionType: 'bid' | 'accepted' | 'completed' | 'hauled' }[] = []

  const addOnce = (
    id: Types.ObjectId | undefined | null,
    name: string,
    email: string,
    interactionType: 'bid' | 'accepted' | 'completed' | 'hauled'
  ) => {
    if (!id) return
    const sid = id.toString()
    if (sid === userId || blockedIds.has(sid) || seen.has(sid)) return
    seen.add(sid)
    results.push({ _id: sid, name, email, interactionType })
  }

  if (userRole === USER_ROLES.DRIVER) {
    const submittedOrAccepted = await BidModel.aggregate<{
      _id: Types.ObjectId
      companyId: Types.ObjectId
      companyName: string
      companyEmail: string
      statuses: string[]
      maxAcceptedAt: Date | null
      hasAccepted: boolean
    }>([
      {
        $match: {
          driverId: uid,
          status: { $in: [BID_STATUSES.Submitted, BID_STATUSES.Accepted] },
        },
      },
      {
        $lookup: {
          from: 'loads',
          localField: 'loadId',
          foreignField: '_id',
          as: 'load',
        },
      },
      { $unwind: '$load' },
      {
        $group: {
          _id: '$load.companyId',
          statuses: { $addToSet: '$status' },
          maxAcceptedAt: {
            $max: { $cond: [{ $eq: ['$status', BID_STATUSES.Accepted] }, '$acceptedAt', null] },
          },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'company',
        },
      },
      { $unwind: '$company' },
      {
        $project: {
          companyId: '$_id',
          companyName: '$company.name',
          companyEmail: '$company.email',
          hasAccepted: { $in: [BID_STATUSES.Accepted, '$statuses'] },
          maxAcceptedAt: 1,
        },
      },
    ])

    for (const c of submittedOrAccepted) {
      const inter = c.hasAccepted ? (c.maxAcceptedAt ? 'accepted' : 'completed') : 'bid'
      addOnce(c.companyId, c.companyName, c.companyEmail, inter)
    }

    const assignedLoads = await LoadModel.aggregate<{
      _id: Types.ObjectId
      companyId: Types.ObjectId
      companyName: string
      companyEmail: string
      status: string
    }>([
      {
        $match: {
          assignedDriverId: uid,
          status: { $in: [LOAD_STATUSES.Booked, LOAD_STATUSES.InTransit, LOAD_STATUSES.Completed] },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'companyId',
          foreignField: '_id',
          as: 'company',
        },
      },
      { $unwind: '$company' },
      {
        $project: {
          companyId: 1,
          companyName: '$company.name',
          companyEmail: '$company.email',
          status: 1,
        },
      },
    ])

    for (const l of assignedLoads) {
      const inter =
        l.status === LOAD_STATUSES.Completed
          ? 'completed'
          : l.status === LOAD_STATUSES.InTransit
            ? 'hauled'
            : 'accepted'
      addOnce(l.companyId, l.companyName, l.companyEmail, inter)
    }
  }

  if (userRole === USER_ROLES.COMPANY) {
    const acceptedBids = await BidModel.aggregate<{
      _id: Types.ObjectId
      driverId: Types.ObjectId
      driverName: string
      driverEmail: string
      acceptedAt: Date | null
    }>([
      { $match: { status: BID_STATUSES.Accepted } },
      {
        $lookup: {
          from: 'loads',
          localField: 'loadId',
          foreignField: '_id',
          as: 'load',
        },
      },
      { $unwind: '$load' },
      { $match: { 'load.companyId': uid } },
      {
        $lookup: {
          from: 'users',
          localField: 'driverId',
          foreignField: '_id',
          as: 'driver',
        },
      },
      { $unwind: '$driver' },
      {
        $project: {
          driverId: 1,
          driverName: '$driver.name',
          driverEmail: '$driver.email',
          acceptedAt: 1,
        },
      },
    ])

    for (const b of acceptedBids) {
      addOnce(b.driverId, b.driverName, b.driverEmail, b.acceptedAt ? 'accepted' : 'completed')
    }

    const assignedLoads = await LoadModel.aggregate<{
      _id: Types.ObjectId
      assignedDriverId: Types.ObjectId
      driverName: string
      driverEmail: string
      status: string
    }>([
      {
        $match: {
          companyId: uid,
          assignedDriverId: { $ne: null },
          status: { $in: [LOAD_STATUSES.Booked, LOAD_STATUSES.InTransit, LOAD_STATUSES.Completed] },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'assignedDriverId',
          foreignField: '_id',
          as: 'driver',
        },
      },
      { $unwind: '$driver' },
      {
        $project: {
          assignedDriverId: 1,
          driverName: '$driver.name',
          driverEmail: '$driver.email',
          status: 1,
        },
      },
    ])

    for (const l of assignedLoads) {
      const inter =
        l.status === LOAD_STATUSES.Completed
          ? 'completed'
          : l.status === LOAD_STATUSES.InTransit
            ? 'hauled'
            : 'accepted'
      addOnce(l.assignedDriverId, l.driverName, l.driverEmail, inter)
    }
  }

  return results
}

/**
 * Unblock a target. Soft-deactivates the entry so admins retain history.
 */
export const unblockUser = async (userId: string, targetId: string) => {
  assertValidId(userId, 'userId')
  assertValidId(targetId, 'targetId')

  const entry = await BlocklistModel.findOneAndUpdate(
    {
      userId: new Types.ObjectId(userId),
      targetId: new Types.ObjectId(targetId),
      isActive: true,
    },
    { isActive: false },
    { new: true }
  )

  if (!entry) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Blocklist entry not found')
  }

  return entry
}
