import { HydratedDocument } from 'mongoose'
import { AuctionModel, IAuction } from '../models/loads/Auction'
import { BidModel } from '../models/loads/Bid'
import { LoadModel } from '../models/loads/Load'
import { AUCTION_STATUSES, BID_STATUSES, LOAD_STATUSES } from '../models/enums'
import { emitBidsUpdate, emitPriceUpdate } from '../events/auctionEvents'
import { HEARTBEAT_INTERVAL_MS, MS_PER_HOUR } from '../constants/auction'

// Convenience alias -> AI helped with this
type AuctionDoc = HydratedDocument<IAuction>

// Payload builders
const buildPricePayload = (loadId: string, auction: AuctionDoc) => ({
  loadId,
  currentPrice: auction.currentPrice,
  currency: auction.currency ?? 'CAD',
  loadEventType: auction.status,
  updatedAt: auction.lastPriceUpdateAt ?? new Date(),
})

const buildBidsPayload = async (loadId: string, auctionStatus: string) => {
  const bids = await BidModel.find({ loadId }).sort({ amount: 1 }).populate('driverId')
  return { loadId, bids, loadEventType: auctionStatus }
}

// Accept the lowest-priced submitted bid on the given auction and close it
const autoAcceptBestBid = async (auction: AuctionDoc): Promise<boolean> => {
  const loadId = auction.loadId.toString()

  const bestBid = await BidModel.findOne({ loadId, status: BID_STATUSES.Submitted })
    .sort({ amount: 1 })
    .populate('driverId')

  if (!bestBid) {
    return
  }
  false

  bestBid.status = BID_STATUSES.Accepted
  bestBid.acceptedAt = new Date()
  await bestBid.save()

  auction.status = AUCTION_STATUSES.Closed
  auction.claimedByDriverId = bestBid.driverId as unknown as typeof auction.claimedByDriverId
  auction.autoAcceptedBidId = bestBid._id as unknown as typeof auction.autoAcceptedBidId
  await auction.save()

  await LoadModel.findByIdAndUpdate(loadId, {
    status: LOAD_STATUSES.Booked,
    assignedDriverId: bestBid.driverId,
  })

  return true
}

// Per acution processor
// Expiry, price creep, cap + auto-accept all pushed to SSE
const processAuction = async (auction: AuctionDoc): Promise<void> => {
  const now = new Date()
  const loadId = auction.loadId.toString()

  // Expiry
  if (auction.expiresAt <= now) {
    const hasBids = auction.bestBidAmount != null
    const shouldAutoAccept = (auction.autoAcceptPercent ?? 0) > 0 && hasBids

    if (shouldAutoAccept) {
      const accepted = await autoAcceptBestBid(auction)
      console.log(
        `[debugging heartbeat] Load ${loadId}: expired → ${accepted ? 'auto-accepted best bid' : 'no submitted bids — closed without winner'}`
      )
    } else {
      auction.status = AUCTION_STATUSES.Closed
      await auction.save()
      await LoadModel.findByIdAndUpdate(loadId, { status: LOAD_STATUSES.AuctionClosed })
      console.log(`[debugging heartbeat] Load ${loadId}: expired → closed (no auto-accept)`)
    }

    const bidsPayload = await buildBidsPayload(loadId, auction.status ?? AUCTION_STATUSES.Closed)
    emitBidsUpdate(loadId, bidsPayload)
    emitPriceUpdate(loadId, buildPricePayload(loadId, auction))
    return
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

  // Always push the price update so clients see the creep in realtime
  emitPriceUpdate(loadId, buildPricePayload(loadId, auction))
  console.log(`[debugging heartbeat] Load ${loadId}: price crept -> $${newPrice}`)

  // Cap reached so auto accept it
  if (
    newPrice >= auction.capPrice &&
    (auction.autoAcceptPercent ?? 0) > 0 &&
    auction.bestBidAmount != null
  ) {
    const accepted = await autoAcceptBestBid(auction)
    if (accepted) {
      const bidsPayload = await buildBidsPayload(loadId, auction.status ?? AUCTION_STATUSES.Closed)
      emitBidsUpdate(loadId, bidsPayload)
      // Send info again so it closes
      emitPriceUpdate(loadId, buildPricePayload(loadId, auction))
      console.log(
        `[debugging heartbeat] Load ${loadId}: reached cap price → auto-accepted best bid`
      )
    }
  }
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
