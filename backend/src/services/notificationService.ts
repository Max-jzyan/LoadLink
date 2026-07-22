import { isValidObjectId, Types } from 'mongoose'
import { StatusCodes } from 'http-status-codes'
import {
  NotificationModel,
  NOTIFICATION_TYPES,
  type NotificationType,
} from '../models/notifications/Notification'
import { ApiError } from '../utils/ApiError'
import { emitNotification } from '../events/notificationEvents'

const assertValidId = (id: string, label: string) => {
  if (!isValidObjectId(id)) throw new ApiError(StatusCodes.BAD_REQUEST, `Invalid ${label}`)
}

// ── internal helper ───────────────────────────────────────────────────────────

/** Create and persist a notification. Non-throwing — errors are logged only. */
export const createNotification = async (params: {
  userId: string
  type: NotificationType
  title: string
  message?: string
  data?: Record<string, unknown>
}) => {
  try {
    const notification = await NotificationModel.create({
      userId: new Types.ObjectId(params.userId),
      type: params.type,
      title: params.title,
      message: params.message ?? '',
      data: params.data ?? {},
    })

    // Emit event for SSE subscribers (in-process notification)
    emitNotification(params.userId, notification.toObject())

    return notification
  } catch (err) {
    console.error('[notificationService] Failed to create notification:', err)
    return null
  }
}

// ── domain helpers (called from other services) ───────────────────────────────

export const notifyBidReceived = (
  companyUserId: string,
  opts: { loadId: string; driverName: string; amount: number; bidId: string }
) =>
  createNotification({
    userId: companyUserId,
    type: NOTIFICATION_TYPES.BID_RECEIVED,
    title: 'New bid received',
    message: `${opts.driverName} placed a bid of $${opts.amount.toFixed(2)} on your load.`,
    data: { loadId: opts.loadId, bidId: opts.bidId, amount: opts.amount },
  })

export const notifyBidAccepted = (
  driverUserId: string,
  opts: { loadId: string; amount: number; rateConfirmationUrl?: string | null }
) =>
  createNotification({
    userId: driverUserId,
    type: NOTIFICATION_TYPES.BID_ACCEPTED,
    title: 'Your bid was accepted!',
    message: `Your bid of $${opts.amount.toFixed(2)} was accepted. Your rate confirmation is ready.`,
    data: {
      loadId: opts.loadId,
      amount: opts.amount,
      rateConfirmationUrl: opts.rateConfirmationUrl ?? null,
    },
  })

export const notifyLoadClaimed = (
  companyUserId: string,
  opts: { loadId: string; driverName: string; payout: number }
) =>
  createNotification({
    userId: companyUserId,
    type: NOTIFICATION_TYPES.LOAD_CLAIMED,
    title: 'Load claimed',
    message: `${opts.driverName} claimed your load at the current price of $${opts.payout.toFixed(2)}.`,
    data: { loadId: opts.loadId, payout: opts.payout },
  })

export const notifyAuctionExpired = (companyUserId: string, opts: { loadId: string }) =>
  createNotification({
    userId: companyUserId,
    type: NOTIFICATION_TYPES.AUCTION_EXPIRED,
    title: 'Auction expired',
    message: 'One of your auctions has expired without a winner.',
    data: { loadId: opts.loadId },
  })

export const notifyRateConfirmationReady = (
  userId: string,
  opts: { loadId: string; bidId: string; url: string }
) =>
  createNotification({
    userId,
    type: NOTIFICATION_TYPES.RATE_CONFIRMATION_READY,
    title: 'Rate confirmation ready',
    message: 'Your rate confirmation document is ready for download.',
    data: { loadId: opts.loadId, bidId: opts.bidId, rateConfirmationUrl: opts.url },
  })

export const notifyDriverCheckedIn = (
  companyUserId: string,
  opts: {
    loadId: string
    driverName: string
    commodity: string
    coords: { lat: number; lng: number }
    checkedInAt: Date
  }
) =>
  createNotification({
    userId: companyUserId,
    type: NOTIFICATION_TYPES.DRIVER_CHECKED_IN,
    title: 'Driver checked in',
    message: `${opts.driverName} has checked in for load #${opts.loadId.slice(-6).toUpperCase()} (${opts.commodity}).`,
    data: { loadId: opts.loadId, coords: opts.coords, checkedInAt: opts.checkedInAt.toISOString() },
  })

export const notifyDocumentUploaded = (
  adminUserIds: string[],
  opts: { uploaderName: string; docType: string; ownerId: string }
) =>
  Promise.all(
    adminUserIds.map((adminId) =>
      createNotification({
        userId: adminId,
        type: NOTIFICATION_TYPES.DOCUMENT_UPLOADED,
        title: 'Document uploaded for review',
        message: `${opts.uploaderName} uploaded a ${opts.docType} document.`,
        data: { ownerId: opts.ownerId, docType: opts.docType },
      })
    )
  )

export const notifyDocumentApproved = (userId: string, opts: { docType: string }) =>
  createNotification({
    userId,
    type: NOTIFICATION_TYPES.DOCUMENT_APPROVED,
    title: 'Document approved',
    message: `Your ${opts.docType} document has been approved.`,
    data: { docType: opts.docType },
  })

export const notifyDocumentRejected = (
  userId: string,
  opts: { docType: string; reason?: string }
) =>
  createNotification({
    userId,
    type: NOTIFICATION_TYPES.DOCUMENT_REJECTED,
    title: 'Document rejected',
    message: `Your ${opts.docType} document was rejected.${opts.reason ? ` Reason: ${opts.reason}` : ''}`,
    data: { docType: opts.docType, reason: opts.reason },
  })

/**
 * Notify a driver that one or more of their documents are expiring within 30 days.
 * Sent at most once per ~23 hours (dedup handled by the caller).
 */
export const notifyDocumentExpiringSoon = (
  userId: string,
  opts: { docNames: string[]; daysUntilExpiry: number }
) => {
  const list = opts.docNames.join(', ')
  const plural = opts.docNames.length > 1 ? 'documents are' : 'document is'
  return createNotification({
    userId,
    type: NOTIFICATION_TYPES.DOCUMENT_EXPIRING_SOON,
    title: 'Document renewal required',
    message: `Your ${list} ${plural} expiring in ${opts.daysUntilExpiry} day${opts.daysUntilExpiry !== 1 ? 's' : ''}. Please upload a renewed copy.`,
    data: { docNames: opts.docNames, daysUntilExpiry: opts.daysUntilExpiry },
  })
}

/**
 * Notify a driver that one or more of their documents have already expired.
 * Sent at most once per ~23 hours (dedup handled by the caller).
 */
export const notifyDocumentExpired = (userId: string, opts: { docNames: string[] }) => {
  const list = opts.docNames.join(', ')
  const plural = opts.docNames.length > 1 ? 'documents have' : 'document has'
  return createNotification({
    userId,
    type: NOTIFICATION_TYPES.DOCUMENT_EXPIRED,
    title: 'Document expired',
    message: `Your ${list} ${plural} expired. Please upload renewed documents as soon as possible.`,
    data: { docNames: opts.docNames },
  })
}

/**
 * Notify a user that they received an in-app message on a load thread.
 *
 * De-duplicated per thread: if the recipient already has an UNREAD
 * message notification for this load, it is updated in place (latest preview,
 * bumped timestamp) instead of piling up one bell entry per message.
 */
export const notifyMessageReceived = async (
  recipientUserId: string,
  opts: { loadId: string; senderName: string; preview: string; recipientRole: string }
) => {
  const title = `New message from ${opts.senderName}`
  const message = opts.preview.length > 120 ? `${opts.preview.slice(0, 117)}…` : opts.preview
  const data = { loadId: opts.loadId, recipientRole: opts.recipientRole }

  try {
    const existing = await NotificationModel.findOneAndUpdate(
      {
        userId: new Types.ObjectId(recipientUserId),
        type: NOTIFICATION_TYPES.MESSAGE_RECEIVED,
        isRead: false,
        'data.loadId': opts.loadId,
      },
      { title, message, data, createdAt: new Date() },
      { new: true, timestamps: false }
    )
    if (existing) {
      // The upsert path bypasses createNotification, so push to SSE here too
      emitNotification(recipientUserId, existing.toObject())
      return existing
    }
  } catch (err) {
    console.error('[notificationService] Failed to upsert message notification:', err)
  }

  return createNotification({
    userId: recipientUserId,
    type: NOTIFICATION_TYPES.MESSAGE_RECEIVED,
    title,
    message,
    data,
  })
}

// ── CRUD (used by controller) ─────────────────────────────────────────────────

/** Paginated list of notifications for a user, newest first. */
export const listNotifications = async (
  userId: string,
  opts: { page?: number; limit?: number; unreadOnly?: boolean } = {}
) => {
  assertValidId(userId, 'userId')
  const page = Math.max(1, opts.page ?? 1)
  const limit = Math.min(100, opts.limit ?? 20)
  const skip = (page - 1) * limit

  const filter: Record<string, unknown> = { userId: new Types.ObjectId(userId) }
  if (opts.unreadOnly) filter.isRead = false

  const [notifications, totalCount, unreadCount] = await Promise.all([
    NotificationModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    NotificationModel.countDocuments(filter),
    NotificationModel.countDocuments({ userId: new Types.ObjectId(userId), isRead: false }),
  ])

  return { notifications, totalCount, unreadCount, page, limit }
}

/** Mark a single notification as read (must belong to the requesting user). */
export const markAsRead = async (notificationId: string, userId: string) => {
  assertValidId(notificationId, 'notificationId')
  assertValidId(userId, 'userId')

  const notification = await NotificationModel.findOneAndUpdate(
    { _id: new Types.ObjectId(notificationId), userId: new Types.ObjectId(userId) },
    { isRead: true },
    { new: true }
  )

  if (!notification) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Notification not found')
  }
  return notification
}

/** Mark all of a user's unread notifications as read. */
export const markAllAsRead = async (userId: string) => {
  assertValidId(userId, 'userId')

  const result = await NotificationModel.updateMany(
    { userId: new Types.ObjectId(userId), isRead: false },
    { isRead: true }
  )

  return { modifiedCount: result.modifiedCount }
}

/** Delete a single notification (must belong to the requesting user). */
export const deleteNotification = async (notificationId: string, userId: string) => {
  assertValidId(notificationId, 'notificationId')
  assertValidId(userId, 'userId')

  const result = await NotificationModel.deleteOne({
    _id: new Types.ObjectId(notificationId),
    userId: new Types.ObjectId(userId),
  })

  if (result.deletedCount === 0) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Notification not found')
  }
}

/** Return only the unread count (lightweight — for the notification badge). */
export const getUnreadCount = async (userId: string) => {
  assertValidId(userId, 'userId')
  const count = await NotificationModel.countDocuments({
    userId: new Types.ObjectId(userId),
    isRead: false,
  })
  return { unreadCount: count }
}
