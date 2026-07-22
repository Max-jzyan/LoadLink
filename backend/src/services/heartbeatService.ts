import { HydratedDocument, Types } from 'mongoose'
import { AuctionModel, IAuction } from '../models/loads/Auction'
import { BidModel } from '../models/loads/Bid'
import { LoadModel } from '../models/loads/Load'
import { AUCTION_STATUSES, BID_STATUSES, LOAD_STATUSES } from '../models/enums'
import { emitBidsAndPrice, settleAuctionWithBid } from './auctionService'
import { HEARTBEAT_INTERVAL_MS, MS_PER_HOUR } from '../constants/auction'
import { DriverModel } from '../models/users/Driver'
import {
  NotificationModel,
  NOTIFICATION_TYPES,
  type NotificationType,
} from '../models/notifications/Notification'
import {
  notifyDocumentExpiringSoon,
  notifyDocumentExpired,
} from './notificationService'

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

  // Check if the new price meets or exceeds the lowest submitted bid
  // (reverse auction: price ticks up, lowest bid wins when price reaches it)
  const lowestBid = await BidModel.findOne({ loadId, status: BID_STATUSES.Submitted }).sort({
    amount: 1,
  })
  if (lowestBid && newPrice >= lowestBid.amount) {
    await settleAuctionWithBid(auction, lowestBid)
    console.log(
      `[debugging heartbeat] Load ${loadId}: price $${newPrice} reached lowest bid $${lowestBid.amount} → auto-accepted`
    )
    await emitBidsAndPrice(loadId)
    return
  }

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

// ── Document expiry scanner ───────────────────────────────────────────────────

const EXPIRY_WARN_DAYS = 30
const EXPIRY_CHECK_INTERVAL_MS = 24 * MS_PER_HOUR
/** Re-notify at most once per 23h to survive server restarts without double-firing */
const NOTIFY_DEDUP_MS = 23 * MS_PER_HOUR

/**
 * Check whether a notification of the given type was already sent to `userId`
 * within the last NOTIFY_DEDUP_MS milliseconds.
 */
const recentlyNotified = async (
  userId: string,
  type: NotificationType
): Promise<boolean> => {
  const since = new Date(Date.now() - NOTIFY_DEDUP_MS)
  const exists = await NotificationModel.exists({
    userId: new Types.ObjectId(userId),
    type,
    createdAt: { $gte: since },
  })
  return !!exists
}

/**
 * Scan every driver's insurance certs + certification documents for
 * upcoming or already-expired documents and fire a single per-driver
 * notification per category (expiring-soon / expired).
 */
const runExpiryCheck = async (): Promise<void> => {
  const now = new Date()
  const warnCutoff = new Date(now.getTime() + EXPIRY_WARN_DAYS * 24 * MS_PER_HOUR)

  // Only load drivers who have *any* document with an expiresAt set
  const drivers = await DriverModel.find({
    $or: [
      { 'insuranceCertificates.expiresAt': { $ne: null, $exists: true } },
      { 'certificationDocuments.expiresAt': { $ne: null, $exists: true } },
    ],
  })
    .select('_id insuranceCertificates certificationDocuments')
    .lean()

  for (const driver of drivers) {
    const driverId = (driver._id as Types.ObjectId).toString()

    // Build flat list of { name, expiresAt } across both doc types
    const allDocs: { name: string; expiresAt: Date }[] = [
      ...((driver.insuranceCertificates ?? [])
        .filter((c) => c.expiresAt)
        .map((c) => ({ name: `Insurance (${(c as any).insurer ?? 'cert'})`, expiresAt: new Date(c.expiresAt as Date) }))),
      ...((driver.certificationDocuments ?? [])
        .filter((d) => (d as any).expiresAt)
        .map((d) => ({ name: d.name, expiresAt: new Date((d as any).expiresAt) }))),
    ]

    const expiredDocs = allDocs.filter((d) => d.expiresAt <= now)
    const expiringSoon = allDocs.filter((d) => d.expiresAt > now && d.expiresAt <= warnCutoff)

    // --- Expired ---
    if (expiredDocs.length > 0) {
      const alreadyNotified = await recentlyNotified(driverId, NOTIFICATION_TYPES.DOCUMENT_EXPIRED)
      if (!alreadyNotified) {
        await notifyDocumentExpired(driverId, {
          docNames: expiredDocs.map((d) => d.name),
        })
        console.log(
          `[expiry-check] Notified driver ${driverId} of ${expiredDocs.length} expired doc(s)`
        )
      }
    }

    // --- Expiring soon ---
    if (expiringSoon.length > 0) {
      const alreadyNotified = await recentlyNotified(
        driverId,
        NOTIFICATION_TYPES.DOCUMENT_EXPIRING_SOON
      )
      if (!alreadyNotified) {
        // Report the minimum days-until-expiry for the message
        const minDays = Math.max(
          1,
          Math.floor(
            (Math.min(...expiringSoon.map((d) => d.expiresAt.getTime())) - now.getTime()) /
              (24 * MS_PER_HOUR)
          )
        )
        await notifyDocumentExpiringSoon(driverId, {
          docNames: expiringSoon.map((d) => d.name),
          daysUntilExpiry: minDays,
        })
        console.log(
          `[expiry-check] Notified driver ${driverId} of ${expiringSoon.length} doc(s) expiring within ${EXPIRY_WARN_DAYS}d`
        )
      }
    }
  }
}

/**
 * Start the daily document-expiry checker.
 * Returns a cleanup function that stops the interval.
 */
export const startDocumentExpiryChecker = (): (() => void) => {
  console.log('[expiry-check] Starting — interval 24h')

  // Boot scan after a short delay so the DB connection is fully ready
  setTimeout(() => {
    runExpiryCheck().catch((err) =>
      console.error('[expiry-check] Boot scan failed:', err)
    )
  }, 5_000)

  const timer = setInterval(() => {
    runExpiryCheck().catch((err) =>
      console.error('[expiry-check] Daily scan failed:', err)
    )
  }, EXPIRY_CHECK_INTERVAL_MS)

  return () => {
    clearInterval(timer)
    console.log('[expiry-check] Stopped')
  }
}
