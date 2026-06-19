import { HydratedDocument } from 'mongoose'
import { AuctionModel, IAuction } from '../models/loads/Auction'
import { BidModel } from '../models/loads/Bid'
import { LoadModel } from '../models/loads/Load'
import { AUCTION_STATUSES, BID_STATUSES, LOAD_STATUSES } from '../models/enums'
import { emitBidsAndPrice, settleAuctionWithBid } from './auctionService'
import { HEARTBEAT_INTERVAL_MS, MS_PER_HOUR } from '../constants/auction'

// Convenience alias -> AI helped with this
type AuctionDoc = HydratedDocument<IAuction>

const isAutoAcceptEligible = (auction: AuctionDoc): boolean =>
  (auction.autoAcceptPercent ?? 0) >= 0 && auction.bestBidAmount != null

// Accept the lowest-priced submitted bid on the given auction and close it
const autoAcceptBestBid = async (auction: AuctionDoc): Promise<boolean> => {
  const loadId = auction.loadId.toString()

  const bestBid = await BidModel.findOne({ loadId, status: BID_STATUSES.Submitted }).sort({
    amount: 1,
  })

  if (!bestBid) {
    return false
  }

  const ceiling = auction.capPrice * (1 + (auction.autoAcceptPercent ?? 0) / 100)
  if (bestBid.amount > ceiling) {
    return false
  }

  await settleAuctionWithBid(auction, bestBid)
  return true
}

// Per acution processor
// Expiry, price creep, cap + auto-accept all pushed to SSE
const processAuction = async (auction: AuctionDoc): Promise<void> => {
  const now = new Date()
  const loadId = auction.loadId.toString()

  // Expiry
  if (auction.expiresAt <= now) {
    const accepted = isAutoAcceptEligible(auction) ? await autoAcceptBestBid(auction) : false

    // Always close on expiry. If no eligible bid was auto-accepted (disabled, no bids,
    // or the lowest bid is above the tolerance ceiling), close without a winner.
    if (!accepted) {
      auction.status = AUCTION_STATUSES.Closed
      await auction.save()
      await LoadModel.findByIdAndUpdate(loadId, { status: LOAD_STATUSES.AuctionClosed })
    }

    console.log(
      `[debugging heartbeat] Load ${loadId}: expired → ${accepted ? 'auto-accepted best bid' : 'closed without winner'}`
    )

    await emitBidsAndPrice(loadId)
    return
  }

  // Auto-accept trigger window: once we're within `autoAcceptTriggerHours` of the
  // deadline, start retrying auto-accept every tick instead of waiting for expiry.
  const triggerHours = auction.autoAcceptTriggerHours ?? 0
  if (triggerHours > 0 && isAutoAcceptEligible(auction)) {
    const triggerAt = new Date(auction.expiresAt.getTime() - triggerHours * MS_PER_HOUR)
    if (now >= triggerAt) {
      const accepted = await autoAcceptBestBid(auction)
      if (accepted) {
        console.log(
          `[debugging heartbeat] Load ${loadId}: within auto-accept trigger window → auto-accepted best bid`
        )
        await emitBidsAndPrice(loadId)
        return
      }
    }
  }

  // Price creep
  // Nothing to do if the cap is hit tho
  if (auction.currentPrice >= auction.capPrice) {
    return
  }

  const lastUpdate = auction.lastPriceUpdateAt ? new Date(auction.lastPriceUpdateAt).getTime() : 0
  // TODO: Fix this -> right now I treat never updated as epoch so the first tick fires immediately

  const creepIntervalMs = auction.priceCreepIntervalHours * MS_PER_HOUR
  const msSinceLastUpdate = now.getTime() - lastUpdate

  if (msSinceLastUpdate < creepIntervalMs) {
    return
  }

  const newPrice = Math.min(auction.currentPrice + auction.priceCreepAmount, auction.capPrice)
  auction.currentPrice = newPrice
  auction.lastPriceUpdateAt = now
  await auction.save()

  console.log(`[debugging heartbeat] Load ${loadId}: price crept -> $${newPrice}`)

  // Cap reached so auto-accept the best in-range bid
  if (newPrice >= auction.capPrice && isAutoAcceptEligible(auction)) {
    const accepted = await autoAcceptBestBid(auction)
    if (accepted) {
      console.log(
        `[debugging heartbeat] Load ${loadId}: reached cap price → auto-accepted best bid`
      )
    }
  }

  await emitBidsAndPrice(loadId)
}

// Tick
// INdivdiual auctions failing doesnt affect this
const tick = async (): Promise<void> => {
  const active = await AuctionModel.find({ status: AUCTION_STATUSES.Active })
  if (active.length === 0) {
    return
  }

  await Promise.all(
    active.map((auction) =>
      processAuction(auction as AuctionDoc).catch((err) =>
        console.error(
          `[debugging heartbeat] Error processing auction for load ${auction.loadId}:`,
          err
        )
      )
    )
  )
}

// Public API
export const startHeartbeat = (): (() => void) => {
  console.log(`[debugging heartbeat] Starting — interval ${HEARTBEAT_INTERVAL_MS / 1000}s`)

  // Tick on startup
  tick().catch((err) => {
    console.error('[debugging heartbeat] Boot tick failed:', err)
  })

  const timer = setInterval(() => {
    tick().catch((err) => console.error('[debugging heartbeat] Tick failed:', err))
  }, HEARTBEAT_INTERVAL_MS)

  return () => {
    clearInterval(timer)
    console.log('[debugging heartbeat] Stopped')
  }
}
