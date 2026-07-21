import { EventEmitter } from 'events'
import { SSE_MAX_LISTENERS } from '../constants/sse'

/**
 * In-process pub/sub bus for per-load message threads, mirroring auctionEvents.
 * Send-message handlers publish; open SSE thread streams subscribe.
 *
 * NOTE: like auctionEvents, this only works within a single server process.
 */
export const messageEvents = new EventEmitter()
messageEvents.setMaxListeners(SSE_MAX_LISTENERS)

const threadChannel = (loadId: string) => `messages:${loadId}`

export const emitThreadMessage = (loadId: string, payload: unknown): void => {
  messageEvents.emit(threadChannel(loadId), payload)
}

/** Subscribe to new messages for a load. Returns an unsubscribe function. */
export const onThreadMessage = (
  loadId: string,
  listener: (payload: unknown) => void
): (() => void) => {
  const channel = threadChannel(loadId)
  messageEvents.on(channel, listener)
  return () => messageEvents.off(channel, listener)
}
