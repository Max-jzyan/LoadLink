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

export interface Notification {
  _id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  isRead: boolean
  data: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface NotificationListResponse {
  notifications: Notification[]
  totalCount: number
  unreadCount: number
  page: number
  limit: number
}

export interface UnreadCountResponse {
  unreadCount: number
}
