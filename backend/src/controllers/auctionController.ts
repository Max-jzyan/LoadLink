import { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import { initSSE, sendSSE, startSSEKeepAlive } from '../utils/sse'
import { onBidsUpdate, onPriceUpdate } from '../events/auctionEvents'
import * as auctionService from '../services/auctionService'

/**
 * POST /api/auctions/:loadId
 * Create an auction for an existing load.
 * Body: { startPrice, capPrice, priceCreepAmount, autoAcceptPercent?, autoAcceptTriggerHours?, hoursBeforeDropoff? }
 */
export const createAuction = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const loadId = req.params.loadId as string
    const auction = await auctionService.createAuction(loadId, req.body)
    res.status(StatusCodes.CREATED).json(auction)
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/auctions/:loadId/bids
 * Place a bid on an auction load as a driver.
 * Body: { amount: number }
 */
export const placeBid = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const loadId = req.params.loadId as string
    const { amount } = req.body
    const driverId = req.user!._id
    const bid = await auctionService.placeBid(loadId, driverId, amount)
    res.status(StatusCodes.CREATED).json(bid)
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/auctions/:loadId/claim
 * Instantly claim a load at the current ticking auction price.
 */
export const claimLoad = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const loadId = req.params.loadId as string
    const driverId = req.user!._id
    const result = await auctionService.claimLoad(loadId, driverId)
    res.status(StatusCodes.OK).json(result)
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

// POST /api/auctions/:loadId/reopen
// Reopen a closed auction with a new deadline.
// Body: { extendByHours: number }
export const reopenAuction = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const loadId = req.params.loadId as string
    const { extendByHours = 4 } = req.body as { extendByHours?: number }
    const result = await auctionService.reopenAuction(loadId, extendByHours)
    res.status(StatusCodes.OK).json(result)
  } catch (err) {
    next(err)
  }
}
