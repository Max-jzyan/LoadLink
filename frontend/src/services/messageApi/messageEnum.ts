export const MESSAGE_BODY_MAX_LENGTH = 2000

export interface Message {
  _id: string
  loadId: string
  senderId: string
  recipientId: string
  body: string
  isRead: boolean
  createdAt: string
  updatedAt: string
}

export interface ThreadCounterparty {
  _id: string
  name: string
  role: 'driver' | 'company'
  profilePictureUrl: string
}

export interface MessageThread {
  loadId: string
  messages: Message[]
  counterparty: ThreadCounterparty
}

export interface MessageUnreadCounts {
  total: number
  byLoad: Record<string, number>
}

/** One conversation in the Messages archive list. */
export interface MessageThreadSummary {
  loadId: string
  originAddress: string
  destinationAddress: string
  loadStatus: string
  counterparty: ThreadCounterparty
  lastMessage: {
    body: string
    senderId: string
    createdAt: string
  }
  unreadCount: number
}
