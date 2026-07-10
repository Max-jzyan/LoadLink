import { Schema, model, InferSchemaType, Types } from 'mongoose'

export const NOTIFICATION_TYPES = {
  BID_RECEIVED: 'bid_received',
  BID_ACCEPTED: 'bid_accepted',
  BID_REJECTED: 'bid_rejected',
  LOAD_CLAIMED: 'load_claimed',
  AUCTION_EXPIRED: 'auction_expired',
  AUCTION_CANCELLED: 'auction_cancelled',
  LOAD_STATUS_CHANGED: 'load_status_changed',
  RATE_CONFIRMATION_READY: 'rate_confirmation_ready',
  DOCUMENT_UPLOADED: 'document_uploaded',
  DOCUMENT_APPROVED: 'document_approved',
  DOCUMENT_REJECTED: 'document_rejected',
} as const

export type NotificationType = (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES]
export const NOTIFICATION_TYPE_VALUES = Object.values(NOTIFICATION_TYPES)

const NotificationSchema = new Schema(
  {
    /** The user this notification belongs to */
    userId: {
      type: Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: NOTIFICATION_TYPE_VALUES,
      required: true,
    },

    /** Human-readable subject line shown in the notification list */
    title: { type: String, required: true },

    /** Longer description: optional body text */
    message: { type: String, default: '' },

    /** Whether the user has opened/read this notification */
    isRead: { type: Boolean, default: false, index: true },

    /**
     * Flexible payload: ids of related entities (load, bid, auction, etc.)
     * Kept as a plain object so callers can attach whatever context they need.
     */
    data: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
)

// Compound index used by the common "unread count" query
NotificationSchema.index({ userId: 1, isRead: 1 })

export type INotification = InferSchemaType<typeof NotificationSchema>
export const NotificationModel = model<INotification>('Notification', NotificationSchema)
