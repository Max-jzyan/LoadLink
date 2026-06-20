import { EventEmitter } from 'events'
import { SSE_MAX_LISTENERS } from '../constants/sse'

/**
 * In-process pub/sub bus for auction SSE streams.
 *
 * An open SSE stream has no way to know when a bid or price changed, because the
 * code that mutates them (e.g. acceptBid, or a future driver place-bid endpoint)
 * runs in a different request handler. This shared EventEmitter connects the two:
 * stream handlers subscribe, mutation handlers publish.
 *
 * NOTE: this only works within a single server process. If we ever run multiple
 * backend instances, swap this for Redis pub/sub or MongoDB change streams.
 */
export const auctionEvents = new EventEmitter()
auctionEvents.setMaxListeners(SSE_MAX_LISTENERS)

const bidsChannel = (loadId: string) => `bids:${loadId}`
const priceChannel = (loadId: string) => `price:${loadId}`
const loadsChannel = 'loads:posted'

export const emitBidsUpdate = (loadId: string, payload: unknown): void => {
  auctionEvents.emit(bidsChannel(loadId), payload)
}

export const emitPriceUpdate = (loadId: string, payload: unknown): void => {
  auctionEvents.emit(priceChannel(loadId), payload)
}

/** Subscribe to bids updates for a load. Returns an unsubscribe function. */
export const onBidsUpdate = (
  loadId: string,
  listener: (payload: unknown) => void
): (() => void) => {
  const channel = bidsChannel(loadId)
  auctionEvents.on(channel, listener)
  return () => auctionEvents.off(channel, listener)
}

/** Subscribe to price updates for a load. Returns an unsubscribe function. */
export const onPriceUpdate = (
  loadId: string,
  listener: (payload: unknown) => void
): (() => void) => {
  const channel = priceChannel(loadId)
  auctionEvents.on(channel, listener)
  return () => auctionEvents.off(channel, listener)
}

export const emitLoadPosted = (payload: unknown): void => {
  auctionEvents.emit(loadsChannel, payload)
}

export const onLoadPosted = (listener: (payload: unknown) => void): (() => void) => {
  auctionEvents.on(loadsChannel, listener)
  return () => auctionEvents.off(loadsChannel, listener)
}
