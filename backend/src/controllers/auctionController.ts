import { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import { isValidObjectId, Types } from 'mongoose'
import { initSSE, sendSSE, startSSEKeepAlive } from '../utils/sse'
import { onBidsUpdate, onPriceUpdate } from '../events/auctionEvents'
import { emitBidsUpdate, emitPriceUpdate } from '../events/auctionEvents'
import { BidModel } from '../models/loads/Bid'
import { AuctionModel } from '../models/loads/Auction'
import { LoadModel } from '../models/loads/Load'
import { AUCTION_STATUSES, BID_STATUSES, LOAD_STATUSES } from '../models/enums'
import { ApiError } from '../utils/ApiError'
import * as auctionService from '../services/auctionService'

// ── helpers ──────────────────────────────────────────────────────────────

const assertValidId = (id: string, label: string) => {
  if (!isValidObjectId(id)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, `Invalid ${label}`)
  }
}

const findAuctionOrThrow = async (loadId: string) => {
  const auction = await AuctionModel.findOne({ loadId: new Types.ObjectId(loadId) })
  if (!auction) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Auction not found for load')
  }
  return auction
}

const buildBidsPayload = async (loadId: string) => {
  const auction = await AuctionModel.findOne({ loadId: new Types.ObjectId(loadId) })
  if (!auction) return null

  const bids = await BidModel.find({ loadId: new Types.ObjectId(loadId) })
    .sort({ amount: 1 })
    .populate('driverId')

  return {
    loadId,
    bids,
    loadEventType: auction.status,
  }
}

const buildPricePayload = async (loadId: string) => {
  const auction = await AuctionModel.findOne({ loadId: new Types.ObjectId(loadId) })
  if (!auction) return null

  return {
    loadId,
    currentPrice: auction.currentPrice,
    currency: auction.currency,
    loadEventType: auction.status,
    updatedAt: auction.lastPriceUpdateAt,
  }
}

const emitBidsAndPrice = async (loadId: string) => {
  const bidsPayload = await buildBidsPayload(loadId)
  if (bidsPayload) emitBidsUpdate(loadId, bidsPayload)

  const pricePayload = await buildPricePayload(loadId)
  if (pricePayload) emitPriceUpdate(loadId, pricePayload)
}

// ── endpoints ────────────────────────────────────────────────────────────

/**
 * POST /api/auctions/:loadId/bids
 * Place a bid on an auction load as a driver.
 * Body: { driverId: string, amount: number }
 */
export const placeBid = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const loadId = req.params.loadId as string
    const { driverId, amount } = req.body

    assertValidId(loadId, 'loadId')
    assertValidId(driverId, 'driverId')

    if (!amount || amount < 1) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Bid amount must be at least 1')
    }

    const auction = await findAuctionOrThrow(loadId)
    if (auction.status !== AUCTION_STATUSES.Active) {
      throw new ApiError(StatusCodes.CONFLICT, `Auction is not live (status: ${auction.status})`)
    }

    const bid = await BidModel.create({
      loadId: new Types.ObjectId(loadId),
      auctionId: auction._id,
      driverId: new Types.ObjectId(driverId),
      amount,
      status: BID_STATUSES.Submitted,
    })

    await bid.populate('driverId')
    await emitBidsAndPrice(loadId)

    res.status(StatusCodes.CREATED).json(bid)
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/auctions/:loadId/claim
 * Instantly claim a load at the current ticking auction price.
 * Body: { driverId: string }
 */
export const claimLoad = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const loadId = req.params.loadId as string
    const { driverId } = req.body

    assertValidId(loadId, 'loadId')
    assertValidId(driverId, 'driverId')

    const auction = await findAuctionOrThrow(loadId)
    if (auction.status !== AUCTION_STATUSES.Active) {
      throw new ApiError(StatusCodes.CONFLICT, `Auction is not live (status: ${auction.status})`)
    }

    // Create a bid at the current price (mark accepted immediately)
    const bid = await BidModel.create({
      loadId: new Types.ObjectId(loadId),
      auctionId: auction._id,
      driverId: new Types.ObjectId(driverId),
      amount: auction.currentPrice,
      status: BID_STATUSES.Accepted,
      acceptedAt: new Date(),
    })

    // Close the auction
    auction.status = AUCTION_STATUSES.Closed
    auction.claimedByDriverId = new Types.ObjectId(driverId)
    auction.autoAcceptedBidId = bid._id as Types.ObjectId
    await auction.save()

    // Assign the load to the driver
    await LoadModel.findByIdAndUpdate(new Types.ObjectId(loadId), {
      status: LOAD_STATUSES.Booked,
      assignedDriverId: new Types.ObjectId(driverId),
    })

    await emitBidsAndPrice(loadId)

    res.status(StatusCodes.OK).json({
      loadId,
      finalPayout: auction.currentPrice,
      rateConfirmationUrl: `/api/rate-confirmation/rc_${bid._id}.pdf`,
    })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/auctions/:loadId/bids
 * SSE stream of all bids for a load. Sends an initial snapshot, then pushes a
 * fresh payload whenever a bid changes (published on the auctionEvents bus).
 */
export const streamBids = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const loadId = req.params.loadId as string
    const snapshot = await auctionService.getBidsSnapshot(loadId)

    initSSE(res)
    sendSSE(res, snapshot)

    const keepAlive = startSSEKeepAlive(res)
    const unsubscribe = onBidsUpdate(loadId, (payload) => sendSSE(res, payload))

    req.on('close', () => {
      clearInterval(keepAlive)
      unsubscribe()
      res.end()
    })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/auctions/:loadId/price
 * SSE stream of the current auction price for a load. Sends an initial snapshot,
 * then pushes a fresh payload whenever the price changes.
 */
export const streamPrice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const loadId = req.params.loadId as string
    const snapshot = await auctionService.getPriceSnapshot(loadId)

    initSSE(res)
    sendSSE(res, snapshot)

    const keepAlive = startSSEKeepAlive(res)
    const unsubscribe = onPriceUpdate(loadId, (payload) => sendSSE(res, payload))

    req.on('close', () => {
      clearInterval(keepAlive)
      unsubscribe()
      res.end()
    })
  } catch (err) {
    next(err)
  }
}

/**
 * PATCH /api/auctions/:loadId/bids/:bidId
 * Accept a bid: close the auction, book the load, and award it to the bidding driver.
 */
export const acceptBid = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const loadId = req.params.loadId as string
    const bidId = req.params.bidId as string
    const result = await auctionService.acceptBid(loadId, bidId)
    res.status(StatusCodes.OK).json(result)
  } catch (err) {
    next(err)
  }
}

/**
 * PATCH /api/auctions/:loadId
 * Update editable auction fields: extend the deadline, raise the price ceiling,
 * and/or adjust the auto-accept tolerance.
 */
export const updateAuction = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const loadId = req.params.loadId as string
    const result = await auctionService.updateAuction(loadId, req.body)
    res.status(StatusCodes.OK).json(result)
  } catch (err) {
    next(err)
  }
}

/**
 * DELETE /api/auctions/:loadId
 * Cancel the ongoing auction and remove (cancel) the load.
 */
export const cancelAuction = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const loadId = req.params.loadId as string
    await auctionService.cancelAuction(loadId)
    res.status(StatusCodes.NO_CONTENT).send()
  } catch (err) {
    next(err)
  }
}