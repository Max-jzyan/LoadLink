import { HydratedDocument, isValidObjectId } from 'mongoose'
import { StatusCodes } from 'http-status-codes'
import { BidModel, type Bid } from '../models/loads/Bid'
import { AuctionModel, type IAuction } from '../models/loads/Auction'
import { LoadModel } from '../models/loads/Load'
import '../models/users/Driver'
import { AUCTION_STATUSES, BID_STATUSES, LOAD_STATUSES } from '../models/enums'
import { emitBidsUpdate, emitPriceUpdate } from '../events/auctionEvents'
import { ApiError } from '../utils/ApiError'
import { MS_PER_MINUTE, MS_PER_HOUR, RATE_CONFIRMATION_URL_BASE } from '../constants/auction'

const assertValidId = (id: string, label: string) => {
  if (!isValidObjectId(id)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, `Invalid ${label}`)
  }
}

const findAuctionOrThrow = async (loadId: string) => {
  const auction = await AuctionModel.findOne({ loadId })
  if (!auction) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Auction not found for load')
  }
  return auction
}

/**
 * Build the current bids snapshot for a load (tolerant: returns null if no auction).
 * Bids are sorted best-first (lowest amount in this reverse auction) and the driver is
 * populated so each bid carries the driver's name, firebaseUid and rating.
 */
const buildBidsPayload = async (loadId: string) => {
  const auction = await AuctionModel.findOne({ loadId })
  if (!auction) return null

  const bids = await BidModel.find({ loadId }).sort({ amount: 1 }).populate('driverId')

  return {
    loadId,
    bids,
    loadEventType: auction.status,
  }
}

/** Build the current price snapshot for a load (tolerant: returns null if no auction). */
const buildPricePayload = async (loadId: string) => {
  const auction = await AuctionModel.findOne({ loadId })
  if (!auction) return null

  return {
    loadId,
    currentPrice: auction.currentPrice,
    currency: auction.currency,
    loadEventType: auction.status,
    updatedAt: auction.lastPriceUpdateAt,
  }
}

/** Push fresh bids + price snapshots to any open SSE streams for a load. */
export const emitBidsAndPrice = async (loadId: string) => {
  const bidsPayload = await buildBidsPayload(loadId)
  if (bidsPayload) emitBidsUpdate(loadId, bidsPayload)

  const pricePayload = await buildPricePayload(loadId)
  if (pricePayload) emitPriceUpdate(loadId, pricePayload)
}

/**
 * Flip a bid to accepted, close its auction, and book the load with that driver.
 */
export const settleAuctionWithBid = async (
  auction: HydratedDocument<IAuction>,
  bid: HydratedDocument<Bid>
) => {
  bid.status = BID_STATUSES.Accepted
  bid.acceptedAt = new Date()
  await bid.save()

  auction.status = AUCTION_STATUSES.Closed
  auction.claimedByDriverId = bid.driverId
  auction.autoAcceptedBidId = bid._id
  await auction.save()

  await LoadModel.findByIdAndUpdate(auction.loadId, {
    status: LOAD_STATUSES.Booked,
    assignedDriverId: bid.driverId,
  })
}

interface CreateAuctionData {
  startPrice: number
  capPrice: number
  priceCreepAmount: number
  autoAcceptPercent?: number
  autoAcceptTriggerHours?: number
  hoursBeforeDropoff?: number
}

export const createAuction = async (loadId: string, data: CreateAuctionData) => {
  assertValidId(loadId, 'loadId')

  const load = await LoadModel.findById(loadId)
  if (!load) throw new ApiError(StatusCodes.NOT_FOUND, 'Load not found')

  const existing = await AuctionModel.findOne({ loadId })
  if (existing) throw new ApiError(StatusCodes.CONFLICT, 'An auction already exists for this load')

  if (data.capPrice < data.startPrice) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Cap price must be greater than or equal to start price'
    )
  }
  if (data.priceCreepAmount <= 0) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Price creep amount must be positive')
  }

  const expiresAt = data.hoursBeforeDropoff
    ? new Date(new Date(load.dropoffTime).getTime() - data.hoursBeforeDropoff * 60 * 60 * 1000)
    : new Date(load.dropoffTime)

  const auction = await AuctionModel.create({
    loadId: load._id,
    companyId: load.companyId,
    startPrice: data.startPrice,
    capPrice: data.capPrice,
    currentPrice: data.startPrice,
    priceCreepAmount: data.priceCreepAmount,
    priceCreepIntervalHours: 1,
    autoAcceptPercent: data.autoAcceptPercent ?? 0,
    autoAcceptTriggerHours: data.autoAcceptTriggerHours ?? 0,
    expiresAt,
    status: AUCTION_STATUSES.Active,
  })

  await LoadModel.findByIdAndUpdate(loadId, {
    auctionId: auction._id,
    status: LOAD_STATUSES.AuctionLive,
  })

  return auction
}

export const getBidsSnapshot = async (loadId: string) => {
  assertValidId(loadId, 'loadId')
  const snapshot = await buildBidsPayload(loadId)
  if (!snapshot) throw new ApiError(StatusCodes.NOT_FOUND, 'Auction not found for load')
  return snapshot
}

/** Initial price snapshot for an SSE stream. Validates id + auction existence. */
export const getPriceSnapshot = async (loadId: string) => {
  assertValidId(loadId, 'loadId')
  const snapshot = await buildPricePayload(loadId)
  if (!snapshot) throw new ApiError(StatusCodes.NOT_FOUND, 'Auction not found for load')
  return snapshot
}

/**
 * Accept a bid: close the auction, book the load, and award it to the bidding driver.
 * Pushes updates to any open bids/price streams. Returns the accept result.
 */
export const acceptBid = async (loadId: string, bidId: string) => {
  assertValidId(loadId, 'loadId')
  assertValidId(bidId, 'bidId')

  const auction = await findAuctionOrThrow(loadId)
  if (auction.status !== AUCTION_STATUSES.Active) {
    throw new ApiError(StatusCodes.CONFLICT, `Auction is not live (status: ${auction.status})`)
  }

  const bid = await BidModel.findById(bidId)
  if (!bid || bid.loadId.toString() !== loadId) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Bid not found for this load')
  }

  await settleAuctionWithBid(auction, bid)
  await emitBidsAndPrice(loadId)

  return {
    loadId,
    finalPayout: bid.amount,
    // TODO: generate a real rate-confirmation PDF and upload to S3.
    rateConfirmationUrl: `${RATE_CONFIRMATION_URL_BASE}/rc_${bidId}.pdf`,
  }
}

/** Driver places a bid on a live auction. Returns the populated bid. */
export const placeBid = async (loadId: string, driverId: string, amount: number) => {
  assertValidId(loadId, 'loadId')
  assertValidId(driverId, 'driverId')
  if (typeof amount !== 'number' || amount < 1) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Bid amount must be at least 1')
  }

  const auction = await findAuctionOrThrow(loadId)
  if (auction.status !== AUCTION_STATUSES.Active) {
    throw new ApiError(StatusCodes.CONFLICT, `Auction is not live (status: ${auction.status})`)
  }

  if (amount < auction.currentPrice) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Your bid is below the accept now price.')
  }

  const bid = await BidModel.create({
    loadId,
    auctionId: auction._id,
    driverId,
    amount,
    status: BID_STATUSES.Submitted,
  })

  // Keep bestBidAmount in sync
  // Track the lowest submitted bid so far
  if (auction.bestBidAmount == null || amount < (auction.bestBidAmount as number)) {
    auction.bestBidAmount = amount
    await auction.save()
  }

  await bid.populate('driverId')
  await emitBidsAndPrice(loadId)
  return bid
}

/** Driver instantly claims a live auction at its current price. Closes + books the load. */
export const claimLoad = async (loadId: string, driverId: string) => {
  assertValidId(loadId, 'loadId')
  assertValidId(driverId, 'driverId')

  const auction = await findAuctionOrThrow(loadId)
  if (auction.status !== AUCTION_STATUSES.Active) {
    throw new ApiError(StatusCodes.CONFLICT, `Auction is not live (status: ${auction.status})`)
  }

  const bid = await BidModel.create({
    loadId,
    auctionId: auction._id,
    driverId,
    amount: auction.currentPrice,
    status: BID_STATUSES.Accepted,
    acceptedAt: new Date(),
  })

  auction.status = AUCTION_STATUSES.Closed
  auction.claimedByDriverId = bid.driverId
  auction.autoAcceptedBidId = bid._id
  await auction.save()

  await LoadModel.findByIdAndUpdate(loadId, {
    status: LOAD_STATUSES.Booked,
    assignedDriverId: bid.driverId,
  })

  await emitBidsAndPrice(loadId)

  return {
    loadId,
    finalPayout: auction.currentPrice,
    // TODO: generate a real rate-confirmation PDF and upload to S3.
    rateConfirmationUrl: `${RATE_CONFIRMATION_URL_BASE}/rc_${bid._id}.pdf`,
  }
}

interface UpdateAuctionChanges {
  extendByMinutes?: number
  newPriceCeiling?: number
  autoAcceptTolerancePercentage?: number
}

/** Update editable auction fields: deadline extension, price ceiling, auto-accept tolerance. */
export const updateAuction = async (loadId: string, changes: UpdateAuctionChanges) => {
  assertValidId(loadId, 'loadId')

  const auction = await findAuctionOrThrow(loadId)
  if (auction.status !== AUCTION_STATUSES.Active) {
    throw new ApiError(StatusCodes.CONFLICT, `Auction is not live (status: ${auction.status})`)
  }

  const { extendByMinutes, newPriceCeiling, autoAcceptTolerancePercentage } = changes

  if (typeof extendByMinutes === 'number') {
    auction.expiresAt = new Date(auction.expiresAt.getTime() + extendByMinutes * MS_PER_MINUTE)
  }
  if (typeof newPriceCeiling === 'number') {
    auction.capPrice = newPriceCeiling
  }
  if (typeof autoAcceptTolerancePercentage === 'number') {
    auction.autoAcceptPercent = autoAcceptTolerancePercentage
  }

  await auction.save()

  return {
    loadId,
    newExpiresAt: auction.expiresAt,
    priceCeiling: auction.capPrice,
    autoAcceptToleranceThreshold: auction.capPrice * (1 + (auction.autoAcceptPercent ?? 0) / 100),
  }
}

/** Cancel the ongoing auction and remove (cancel) the load. */
export const cancelAuction = async (loadId: string) => {
  assertValidId(loadId, 'loadId')

  const auction = await findAuctionOrThrow(loadId)

  auction.status = AUCTION_STATUSES.Cancelled
  await auction.save()

  await LoadModel.findByIdAndUpdate(loadId, { status: LOAD_STATUSES.Cancelled })

  await emitBidsAndPrice(loadId)
}

// Reopen a closed auction -> reset it to Active with a new deadline
// and unaccept any accepted bids
export const reopenAuction = async (loadId: string, extendByHours: number) => {
  assertValidId(loadId, 'loadId')
  if (!Number.isFinite(extendByHours) || extendByHours <= 0) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Extension must be a positive number of hours')
  }

  const auction = await findAuctionOrThrow(loadId)
  if (auction.status === AUCTION_STATUSES.Cancelled) {
    throw new ApiError(StatusCodes.CONFLICT, 'A cancelled auction cannot be reopened')
  }
  if (auction.status === AUCTION_STATUSES.Active) {
    throw new ApiError(StatusCodes.CONFLICT, 'Auction is already live')
  }

  // Reset any accepted bids back to submitted so they appear in the list again
  await BidModel.updateMany(
    { loadId, status: BID_STATUSES.Accepted },
    { $set: { status: BID_STATUSES.Submitted, acceptedAt: null } }
  )

  // Recompute the denormalized lowest-bid amount from the (now re-submitted) bids.
  const lowest = await BidModel.findOne({ loadId, status: BID_STATUSES.Submitted }).sort({
    amount: 1,
  })

  auction.status = AUCTION_STATUSES.Active
  auction.expiresAt = new Date(Date.now() + extendByHours * MS_PER_HOUR)
  auction.claimedByDriverId = null
  auction.autoAcceptedBidId = null
  auction.bestBidAmount = lowest?.amount ?? null
  await auction.save()

  await LoadModel.findByIdAndUpdate(loadId, {
    status: LOAD_STATUSES.AuctionLive,
    assignedDriverId: null,
  })

  await emitBidsAndPrice(loadId)

  return { loadId, newExpiresAt: auction.expiresAt }
}
