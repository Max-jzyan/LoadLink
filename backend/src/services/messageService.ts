import { isValidObjectId, Types } from 'mongoose'
import { StatusCodes } from 'http-status-codes'
import { MessageModel, MESSAGE_BODY_MAX_LENGTH } from '../models/messages/Message'
import { LoadModel } from '../models/loads/Load'
import { UserModel } from '../models/users/User'
import { ApiError } from '../utils/ApiError'
import { emitThreadMessage } from '../events/messageEvents'
import { notifyMessageReceived } from './notificationService'
import { USER_ROLES } from '../models/enums'

const assertValidId = (id: string, label: string) => {
  if (!isValidObjectId(id)) throw new ApiError(StatusCodes.BAD_REQUEST, `Invalid ${label}`)
}

interface ThreadContext {
  loadId: string
  counterpartyId: string
  counterpartyRole: string
  companyId: string
  driverId: string
}

/** A thread exists once a driver is assigned; validates userId is a participant. */
export const getThreadContext = async (loadId: string, userId: string): Promise<ThreadContext> => {
  assertValidId(loadId, 'loadId')
  assertValidId(userId, 'userId')

  const load = await LoadModel.findById(loadId).select('companyId assignedDriverId').lean()
  if (!load) throw new ApiError(StatusCodes.NOT_FOUND, 'Load not found')
  if (!load.assignedDriverId) {
    throw new ApiError(
      StatusCodes.CONFLICT,
      'Messaging opens once a driver is assigned to this load'
    )
  }

  const companyId = load.companyId.toString()
  const driverId = load.assignedDriverId.toString()

  if (userId === companyId) {
    return {
      loadId,
      counterpartyId: driverId,
      counterpartyRole: USER_ROLES.DRIVER,
      companyId,
      driverId,
    }
  }
  if (userId === driverId) {
    return {
      loadId,
      counterpartyId: companyId,
      counterpartyRole: USER_ROLES.COMPANY,
      companyId,
      driverId,
    }
  }
  throw new ApiError(StatusCodes.FORBIDDEN, 'Forbidden: not a participant of this thread')
}

// Scoped to the load's current company/driver pair, not just loadId, so a
// reassigned load doesn't leak a previous driver's messages.
export const getThread = async (loadId: string, userId: string) => {
  const ctx = await getThreadContext(loadId, userId)
  const companyObjId = new Types.ObjectId(ctx.companyId)
  const driverObjId = new Types.ObjectId(ctx.driverId)

  const [messages, counterparty] = await Promise.all([
    MessageModel.find({
      loadId: new Types.ObjectId(loadId),
      $or: [
        { senderId: companyObjId, recipientId: driverObjId },
        { senderId: driverObjId, recipientId: companyObjId },
      ],
    })
      .sort({ createdAt: 1 })
      .lean(),
    UserModel.findById(ctx.counterpartyId).select('name role profilePictureUrl').lean(),
  ])

  return {
    loadId,
    messages,
    counterparty: counterparty
      ? {
          _id: counterparty._id.toString(),
          name: counterparty.name,
          role: ctx.counterpartyRole,
          profilePictureUrl: counterparty.profilePictureUrl ?? '',
        }
      : {
          _id: ctx.counterpartyId,
          name: 'Unknown user',
          role: ctx.counterpartyRole,
          profilePictureUrl: '',
        },
  }
}

export const sendMessage = async (loadId: string, senderUserId: string, body: unknown) => {
  const trimmed = typeof body === 'string' ? body.trim() : ''
  if (!trimmed) throw new ApiError(StatusCodes.BAD_REQUEST, 'Message body is required')
  if (trimmed.length > MESSAGE_BODY_MAX_LENGTH) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Message is too long (max ${MESSAGE_BODY_MAX_LENGTH} characters)`
    )
  }

  const ctx = await getThreadContext(loadId, senderUserId)

  const message = await MessageModel.create({
    loadId: new Types.ObjectId(loadId),
    senderId: new Types.ObjectId(senderUserId),
    recipientId: new Types.ObjectId(ctx.counterpartyId),
    body: trimmed,
  })

  emitThreadMessage(loadId, message.toObject())

  // Fire-and-forget: notification failure shouldn't fail the send
  const sender = await UserModel.findById(senderUserId).select('name').lean()
  void notifyMessageReceived(ctx.counterpartyId, {
    loadId,
    senderName: sender?.name ?? 'A user',
    preview: trimmed,
    recipientRole: ctx.counterpartyRole,
  })

  return message
}

export const markThreadRead = async (loadId: string, userId: string) => {
  await getThreadContext(loadId, userId)

  const result = await MessageModel.updateMany(
    {
      loadId: new Types.ObjectId(loadId),
      recipientId: new Types.ObjectId(userId),
      isRead: false,
    },
    { isRead: true }
  )
  return { modifiedCount: result.modifiedCount }
}

interface ThreadAggregateRow {
  _id: Types.ObjectId
  lastMessage: {
    body: string
    senderId: Types.ObjectId
    createdAt: Date
  }
  unreadCount: number
}

// One summary per load the user has exchanged messages on, newest first.
export const listThreads = async (userId: string) => {
  assertValidId(userId, 'userId')
  const uid = new Types.ObjectId(userId)

  const rows = await MessageModel.aggregate<ThreadAggregateRow>([
    { $match: { $or: [{ senderId: uid }, { recipientId: uid }] } },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: '$loadId',
        lastMessage: { $first: '$$ROOT' },
        unreadCount: {
          $sum: {
            $cond: [{ $and: [{ $eq: ['$recipientId', uid] }, { $eq: ['$isRead', false] }] }, 1, 0],
          },
        },
      },
    },
    { $sort: { 'lastMessage.createdAt': -1 } },
  ])

  if (rows.length === 0) return []

  const loads = await LoadModel.find({ _id: { $in: rows.map((r) => r._id) } })
    .select('originAddress destinationAddress status companyId assignedDriverId')
    .lean()
  const loadMap = new Map(loads.map((l) => [l._id.toString(), l]))

  const counterpartyIds = new Set<string>()
  for (const load of loads) {
    const other = load.companyId.toString() === userId ? load.assignedDriverId : load.companyId
    if (other) counterpartyIds.add(other.toString())
  }
  const users = await UserModel.find({ _id: { $in: [...counterpartyIds] } })
    .select('name profilePictureUrl')
    .lean()
  const userMap = new Map(users.map((u) => [u._id.toString(), u]))

  return rows.flatMap((row) => {
    const load = loadMap.get(row._id.toString())
    if (!load) return [] // load was deleted; skip its orphaned thread

    const isCompany = load.companyId.toString() === userId
    const counterpartyId = (isCompany ? load.assignedDriverId : load.companyId)?.toString()
    const counterparty = counterpartyId ? userMap.get(counterpartyId) : undefined

    return [
      {
        loadId: row._id.toString(),
        originAddress: load.originAddress,
        destinationAddress: load.destinationAddress,
        loadStatus: load.status,
        counterparty: {
          _id: counterpartyId ?? '',
          name: counterparty?.name ?? 'Unknown user',
          role: isCompany ? USER_ROLES.DRIVER : USER_ROLES.COMPANY,
          profilePictureUrl: counterparty?.profilePictureUrl ?? '',
        },
        lastMessage: {
          body: row.lastMessage.body,
          senderId: row.lastMessage.senderId.toString(),
          createdAt: row.lastMessage.createdAt,
        },
        unreadCount: row.unreadCount,
      },
    ]
  })
}

export const getUnreadCounts = async (userId: string) => {
  assertValidId(userId, 'userId')

  const rows = await MessageModel.aggregate<{ _id: Types.ObjectId; count: number }>([
    { $match: { recipientId: new Types.ObjectId(userId), isRead: false } },
    { $group: { _id: '$loadId', count: { $sum: 1 } } },
  ])

  const byLoad: Record<string, number> = {}
  let total = 0
  for (const row of rows) {
    byLoad[row._id.toString()] = row.count
    total += row.count
  }
  return { total, byLoad }
}
