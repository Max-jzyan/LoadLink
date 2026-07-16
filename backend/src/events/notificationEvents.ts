import { EventEmitter } from 'events'
import { SSE_MAX_LISTENERS } from '../constants/sse'

/**
 * In-process pub/sub bus for notification SSE streams.
 *
 * An open SSE stream has no way to know when new notifications arrive, because
 * the code that creates them (e.g., notifyBidReceived, notifyBidAccepted) runs
 * in a different request handler. This shared EventEmitter connects the two:
 * stream handlers subscribe, notification creators publish.
 *
 * NOTE: This only works within a single server process. If we ever run multiple
 * backend instances, swap this for Redis pub/sub or MongoDB change streams.
 */
export const notificationEvents = new EventEmitter()
notificationEvents.setMaxListeners(SSE_MAX_LISTENERS)

const notificationChannel = (userId: string) => `notifications:${userId}`

/** Publish a new notification to a specific user's stream. */
export const emitNotification = (userId: string, payload: unknown): void => {
  notificationEvents.emit(notificationChannel(userId), payload)
}

/** Subscribe to notifications for a user. Returns an unsubscribe function. */
export const onNotification = (
  userId: string,
  listener: (payload: unknown) => void
): (() => void) => {
  const channel = notificationChannel(userId)
  notificationEvents.on(channel, listener)
  return () => notificationEvents.off(channel, listener)
}