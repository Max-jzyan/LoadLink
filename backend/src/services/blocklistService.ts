import { StatusCodes } from 'http-status-codes'
import { isValidObjectId, Types } from 'mongoose'
import { BlocklistModel, TARGET_TYPES, TargetType } from '../models/blocklist/Blocklist'
import { UserModel } from '../models/users/User'
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
