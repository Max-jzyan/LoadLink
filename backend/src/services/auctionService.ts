import { HydratedDocument, isValidObjectId, Types } from 'mongoose'
import { StatusCodes } from 'http-status-codes'
import { BidModel, type Bid } from '../models/loads/Bid'
import { AuctionModel, type IAuction } from '../models/loads/Auction'
import { LoadModel } from '../models/loads/Load'
import '../models/users/Driver'
import { AUCTION_STATUSES, BID_STATUSES, LOAD_STATUSES } from '../models/enums'
import { emitBidsUpdate, emitPriceUpdate } from '../events/auctionEvents'
import { ApiError } from '../utils/ApiError'
import { MS_PER_MINUTE, MS_PER_HOUR } from '../constants/auction'
import { generateRateConfirmationPdf, generateBillOfLadingPdf } from './pdfService'
import {
  notifyBidAccepted,
  notifyRateConfirmationReady,
  notifyBolReady,
  notifyLoadClaimed,
} from './notificationService'

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
 * After a driver wins a load (via bid acceptance or claim), find any other
 * submitted bids by the same driver that would be impossible to fulfil due
 * to scheduling overlap, and cancel them (set status → withdrawn).
 * Also pushes SSE updates for each affected load.
 */
const cancelConflictingBidsForDriver = async (driverId: string, acceptedLoadId: string) => {
  // 1. Fetch the accepted load's schedule window
  const acceptedLoad = await LoadModel.findById(acceptedLoadId).lean()
  if (!acceptedLoad) return

  const targetPickup = new Date(acceptedLoad.pickupTime).getTime()
  const targetDropoff = new Date(acceptedLoad.dropoffTime).getTime()

  // 2. Find all submitted bids by this driver for other loads
  const conflictingBids = await BidModel.find({
    driverId: new Types.ObjectId(driverId),
    loadId: { $ne: new Types.ObjectId(acceptedLoadId) },
    status: BID_STATUSES.Submitted,
  })
    .populate<{ loadId: any }>('loadId')
    .lean()

  // 3. Withdraw any that overlap
  const withdrawnLoadIds: string[] = []
  for (const bid of conflictingBids) {
    const otherLoad = bid.loadId as any
    if (!otherLoad || !otherLoad.pickupTime || !otherLoad.dropoffTime) continue

    const otherPickup = new Date(otherLoad.pickupTime).getTime()
    const otherDropoff = new Date(otherLoad.dropoffTime).getTime()

    if (targetPickup < otherDropoff && targetDropoff > otherPickup) {
      await BidModel.findByIdAndUpdate(bid._id, { status: BID_STATUSES.Withdrawn })
      withdrawnLoadIds.push(otherLoad._id.toString())
      console.log(
        `[auctionService] Withdrew bid ${bid._id} on load ${otherLoad._id} due to schedule conflict with accepted load ${acceptedLoadId}`
      )
    }
  }

  // 4. Emit updates for each withdrawn bid's load so SSE clients see the change
  await Promise.all(
    [...new Set(withdrawnLoadIds)].map((lid) =>
      emitBidsAndPrice(lid).catch((err) =>
        console.error(`[auctionService] Failed to emit after withdrawing conflicting bid:`, err)
      )
    )
  )
}

/**
 * Flip a bid to accepted, close its auction, and book the load with that driver.
 * Also cancels any conflicting bids the driver may have on other loads.
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

  // Cancel conflicting bids for this driver on other loads
  await cancelConflictingBidsForDriver(bid.driverId.toString(), auction.loadId.toString())
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

  if (bid.status !== BID_STATUSES.Submitted) {
    throw new ApiError(
      StatusCodes.CONFLICT,
      `Bid cannot be accepted (status: ${bid.status})`
    )
  }

  await settleAuctionWithBid(auction, bid)
  await emitBidsAndPrice(loadId)

  // Generate rate confirmation PDF
  let rateConfirmationUrl: string | null = null
  try {
    const load = await LoadModel.findById(loadId)
      .populate<{ companyId: { companyName: string; businessAddress?: string } }>('companyId')
      .populate<{
        assignedDriverId: {
          name: string
          email: string
          phone?: string
          mcNumber?: string
          dotNumber?: string
        } | null
      }>('assignedDriverId')
      .populate<{ selectedTruckId: { plateNumber: string; trailerLengthFt?: number } | null }>(
        'selectedTruckId'
      )
      .lean()

    if (load) {
      const company = load.companyId as any
      const driver = load.assignedDriverId as any
      const truck = load.selectedTruckId as any
      const pdfResult = await generateRateConfirmationPdf({
        loadId,
        bidId,
        companyName: company?.companyName ?? 'Unknown Company',
        companyAddress: company?.businessAddress,
        driverName: driver?.name ?? 'Unknown Driver',
        driverPhone: driver?.phone || undefined,
        driverEmail: driver?.email,
        mcNumber: driver?.mcNumber || undefined,
        dotNumber: driver?.dotNumber || undefined,
        truckNumber: truck?.plateNumber || undefined,
        trailerLengthFt: truck?.trailerLengthFt || undefined,
        originAddress: load.originAddress,
        destinationAddress: load.destinationAddress,
        pickupTime: new Date(load.pickupTime),
        dropoffTime: new Date(load.dropoffTime),
        commodity: load.commodity,
        weightLbs: load.weightLbs,
        truckType: load.truckType,
        finalPayout: bid.amount,
        currency: auction.currency ?? 'CAD',
        confirmedAt: new Date(),
      })
      rateConfirmationUrl = pdfResult.url
      await BidModel.findByIdAndUpdate(bidId, {
        rateConfirmationKey: pdfResult.key,
        rateConfirmationUrl: pdfResult.url,
      })
    }
  } catch (err) {
    console.error('[auctionService] Rate confirmation PDF generation failed:', err)
  }

  // Generate Bill of Lading PDF (blank — driver prints and brings to pickup for shipper signature)
  let bolUrl: string | null = null
  try {
    const load = await LoadModel.findById(loadId)
      .populate<{ companyId: { companyName: string; businessAddress?: string; contactName?: string } }>('companyId')
      .populate<{ assignedDriverId: { name: string; email: string; phone?: string } | null }>('assignedDriverId')
      .lean()

    if (load) {
      const company = load.companyId as any
      const driver = load.assignedDriverId as any
      const bolResult = await generateBillOfLadingPdf({
        loadId,
        bidId,
        shipperName: company?.companyName ?? 'Unknown Shipper',
        shipperAddress: company?.businessAddress,
        shipperContact: company?.contactName,
        carrierName: company?.companyName ?? 'Unknown Carrier',
        driverName: driver?.name ?? 'Unknown Driver',
        driverPhone: driver?.phone,
        originAddress: load.originAddress,
        destinationAddress: load.destinationAddress,
        commodity: load.commodity,
        weightLbs: load.weightLbs,
        currency: auction.currency ?? 'CAD',
        pickupDate: new Date(load.pickupTime),
        deliveryDate: new Date(load.dropoffTime),
        issuedAt: new Date(),
      })
      bolUrl = bolResult.url
      await BidModel.findByIdAndUpdate(bidId, {
        bolKey: bolResult.key,
        bolUrl: bolResult.url,
      })
    }
  } catch (err) {
    console.error('[auctionService] Bill of Lading PDF generation failed:', err)
  }

  // Notify the driver their bid was accepted (includes RC download URL if available)
  await notifyBidAccepted(bid.driverId.toString(), {
    loadId,
    amount: bid.amount,
    rateConfirmationUrl,
  })

  if (rateConfirmationUrl) {
    await notifyRateConfirmationReady(bid.driverId.toString(), {
      loadId,
      bidId,
      url: rateConfirmationUrl,
    })
  }

  if (bolUrl) {
    const driverIdStr = bid.driverId.toString()
    // Notify driver (print & bring to pickup for shipper signature)
    await notifyBolReady(driverIdStr, { loadId, bidId, url: bolUrl, isDriver: true })
    // Notify company (for their records)
    const load = await LoadModel.findById(loadId).lean()
    if (load?.companyId) {
      await notifyBolReady(load.companyId.toString(), {
        loadId,
        bidId,
        url: bolUrl,
        isDriver: false,
      })
    }
  }

  return {
    loadId,
    driverId: bid.driverId.toString(),
    finalPayout: bid.amount,
    rateConfirmationUrl,
    bolUrl,
  }
}

/** Driver places a bid on a live auction. Returns the populated bid. */
export const placeBid = async (
  loadId: string,
  driverId: string,
  amount: number,
  selectedTruckId?: string | null
) => {
  assertValidId(loadId, 'loadId')
  assertValidId(driverId, 'driverId')
  if (selectedTruckId !== undefined && selectedTruckId !== null) {
    assertValidId(selectedTruckId, 'selectedTruckId')
  }
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

  // Optionally associate a truck with the load at bid time
  if (selectedTruckId) {
    await LoadModel.findByIdAndUpdate(loadId, { selectedTruckId })
  }

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
export const claimLoad = async (
  loadId: string,
  driverId: string,
  selectedTruckId?: string | null
) => {
  assertValidId(loadId, 'loadId')
  assertValidId(driverId, 'driverId')
  if (selectedTruckId !== undefined && selectedTruckId !== null) {
    assertValidId(selectedTruckId, 'selectedTruckId')
  }

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

  const loadUpdate: Record<string, unknown> = {
    status: LOAD_STATUSES.Booked,
    assignedDriverId: bid.driverId,
  }
  if (selectedTruckId) {
    loadUpdate.selectedTruckId = selectedTruckId
  }

  await LoadModel.findByIdAndUpdate(loadId, loadUpdate)

  // Cancel conflicting bids for this driver on other loads
  await cancelConflictingBidsForDriver(driverId, loadId)

  await emitBidsAndPrice(loadId)

  // Generate rate confirmation PDF
  let rateConfirmationUrl: string | null = null
  let driverNameForNotification = driverId // fallback to driverId
  try {
    const load = await LoadModel.findById(loadId)
      .populate<{ companyId: { companyName: string; businessAddress?: string } }>('companyId')
      .populate<{
        assignedDriverId: {
          name: string
          email: string
          phone?: string
          mcNumber?: string
          dotNumber?: string
        } | null
      }>('assignedDriverId')
      .populate<{ selectedTruckId: { plateNumber: string; trailerLengthFt?: number } | null }>(
        'selectedTruckId'
      )
      .lean()

    if (load) {
      const company = load.companyId as any
      const driver = load.assignedDriverId as any
      const truck = load.selectedTruckId as any
      driverNameForNotification = driver?.name ?? driverId
      const bidIdStr = bid._id.toString()
      const pdfResult = await generateRateConfirmationPdf({
        loadId,
        bidId: bidIdStr,
        companyName: company?.companyName ?? 'Unknown Company',
        companyAddress: company?.businessAddress,
        driverName: driverNameForNotification,
        driverPhone: driver?.phone || undefined,
        driverEmail: driver?.email,
        mcNumber: driver?.mcNumber || undefined,
        dotNumber: driver?.dotNumber || undefined,
        truckNumber: truck?.plateNumber || undefined,
        trailerLengthFt: truck?.trailerLengthFt || undefined,
        originAddress: load.originAddress,
        destinationAddress: load.destinationAddress,
        pickupTime: new Date(load.pickupTime),
        dropoffTime: new Date(load.dropoffTime),
        commodity: load.commodity,
        weightLbs: load.weightLbs,
        truckType: load.truckType,
        finalPayout: auction.currentPrice,
        currency: auction.currency ?? 'CAD',
        confirmedAt: new Date(),
      })
      rateConfirmationUrl = pdfResult.url
      await BidModel.findByIdAndUpdate(bidIdStr, {
        rateConfirmationKey: pdfResult.key,
        rateConfirmationUrl: pdfResult.url,
      })
    }
  } catch (err) {
    console.error('[auctionService] Rate confirmation PDF generation failed (claim):', err)
  }

  // Generate Bill of Lading PDF for claimed load
  let bolUrl: string | null = null
  try {
    const loadForBol = await LoadModel.findById(loadId)
      .populate<{ companyId: { companyName: string; businessAddress?: string; contactName?: string } }>('companyId')
      .populate<{ assignedDriverId: { name: string; email: string; phone?: string } | null }>('assignedDriverId')
      .lean()

    if (loadForBol) {
      const company = loadForBol.companyId as any
      const driver = loadForBol.assignedDriverId as any
      const bidIdStr = bid._id.toString()
      const bolResult = await generateBillOfLadingPdf({
        loadId,
        bidId: bidIdStr,
        shipperName: company?.companyName ?? 'Unknown Shipper',
        shipperAddress: company?.businessAddress,
        shipperContact: company?.contactName,
        carrierName: driverNameForNotification,
        driverName: driverNameForNotification,
        driverPhone: driver?.phone,
        originAddress: loadForBol.originAddress,
        destinationAddress: loadForBol.destinationAddress,
        commodity: loadForBol.commodity,
        weightLbs: loadForBol.weightLbs,
        currency: auction.currency ?? 'CAD',
        pickupDate: new Date(loadForBol.pickupTime),
        deliveryDate: new Date(loadForBol.dropoffTime),
        issuedAt: new Date(),
      })
      bolUrl = bolResult.url
      await BidModel.findByIdAndUpdate(bidIdStr, {
        bolKey: bolResult.key,
        bolUrl: bolResult.url,
      })
    }
  } catch (err) {
    console.error('[auctionService] Bill of Lading PDF generation failed (claim):', err)
  }

  // Notify driver their claim succeeded (include RC link if generated)
  await notifyBidAccepted(driverId, {
    loadId,
    amount: auction.currentPrice,
    rateConfirmationUrl,
  })

  if (rateConfirmationUrl) {
    await notifyRateConfirmationReady(driverId, {
      loadId,
      bidId: bid._id.toString(),
      url: rateConfirmationUrl,
    })
  }

  if (bolUrl) {
    const bidIdStr = bid._id.toString()
    await notifyBolReady(driverId, { loadId, bidId: bidIdStr, url: bolUrl, isDriver: true })
    await notifyBolReady(auction.companyId.toString(), {
      loadId,
      bidId: bidIdStr,
      url: bolUrl,
      isDriver: false,
    })
  }

  // Notify the company their load was claimed
  await notifyLoadClaimed(auction.companyId.toString(), {
    loadId,
    driverName: driverNameForNotification,
    payout: auction.currentPrice,
  })

  return {
    loadId,
    driverId: bid.driverId.toString(),
    finalPayout: auction.currentPrice,
    rateConfirmationUrl,
    bolUrl,
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

/**
 * Return all auctions for a given company, enriched with load + bid-count data.
 * Sorted newest first.
 */
export const getCompanyAuctions = async (companyId: string) => {
  assertValidId(companyId, 'companyId')

  const auctions = await AuctionModel.find({ companyId })
    .populate('loadId')
    .sort({ createdAt: -1 })
    .lean()

  // Fetch bid counts for all auctions in one aggregation query
  const loadIds = auctions.map((a) => (a.loadId as any)?._id ?? a.loadId)
  const bidCounts = await BidModel.aggregate([
    { $match: { loadId: { $in: loadIds } } },
    { $group: { _id: '$loadId', count: { $sum: 1 } } },
  ])
  const bidCountMap = new Map<string, number>(
    bidCounts.map((bc) => [bc._id.toString(), bc.count as number])
  )

  return auctions.map((a) => ({
    ...a,
    bidCount: bidCountMap.get(((a.loadId as any)?._id ?? a.loadId).toString()) ?? 0,
  }))
}
