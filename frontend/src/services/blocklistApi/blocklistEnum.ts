export type BlockedTargetType = 'company' | 'driver'

/** Populated target user on a blocklist entry (null if the account was deleted) */
export interface BlockedTargetUser {
  _id: string
  name: string
  email: string
  role: BlockedTargetType
}

/** Blocklist entry as returned by GET /api/blocklist/:userId */
export interface BlocklistEntry {
  _id: string
  userId: string
  targetId: BlockedTargetUser | null
  targetType: BlockedTargetType
  reason: string
  blockedAt: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface BlockUserPayload {
  userId: string
  body: {
    targetName: string
    targetType: BlockedTargetType
    reason?: string
  }
}

export interface UnblockUserPayload {
  userId: string
  targetId: string
}

/** Feed preferences stored on the User document */
export interface FeedPreferences {
  hideBlocked?: boolean
  hideBelowMinimum?: boolean
  notifyReview?: boolean
}

export interface UpdateFeedPreferencesPayload {
  userId: string
  body: FeedPreferences
}

/** Known interaction user suggestions for the blocklist block page */
export interface KnownUser {
  _id: string
  name: string
  email: string
  interactionType: 'bid' | 'accepted' | 'completed' | 'hauled'
}
