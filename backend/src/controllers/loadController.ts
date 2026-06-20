import { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import { LoadModel } from '../models/loads/Load'
import { AuctionModel } from '../models/loads/Auction'
import { LOAD_STATUSES } from '../models/enums'
import { computeRoute } from '../lib/routing'
import { emitLoadPosted, onLoadPosted } from '../events/auctionEvents'
import { initSSE, sendSSE, startSSEKeepAlive } from '../utils/sse'

/**
 * GET /api/loads/:loadId
 * Fetch a single load by its ID.
 */
export const getLoad = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { loadId } = req.params

    const load = await LoadModel.findById(loadId)
      .populate('companyId')
      .populate('assignedDriverId')
      .populate('auctionId')

    if (!load) {
      res.status(StatusCodes.NOT_FOUND).json({ message: 'Load not found' })
      return
    }

    res.status(StatusCodes.OK).json(load)
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/company/:companyId/loads
 * Create a new load posting for a company.
 */
export const createLoad = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const companyId = req.params.companyId as string

    const {
      startPrice,
      capPrice,
      priceCreepAmount,
      priceCreepIntervalHours = 1,
      autoAcceptPercent = 0,
      autoAcceptTriggerHours = 0,
      expiresAt,
      ...loadFields
    } = req.body

    // Create load immediately as auction_live
    const load = await LoadModel.create({
      ...loadFields,
      companyId,
      createdBy: companyId,
      status: LOAD_STATUSES.AuctionLive,
    })

    // Compute and persist the driving route -> failure is allowed
    const routeSegment = await computeRoute(loadFields.originCoords, loadFields.destinationCoords)
    if (routeSegment) {
      load.route = routeSegment
      await load.save()
    }

    // Create the auction too
    const auction = await AuctionModel.create({
      loadId: load._id,
      companyId,
      startPrice,
      capPrice,
      priceCreepAmount,
      priceCreepIntervalHours,
      autoAcceptPercent,
      autoAcceptTriggerHours,
      currentPrice: startPrice,
      expiresAt,
    })

    // Link the auction tp the laod
    load.auctionId = auction._id
    await load.save()

    emitLoadPosted({ loadId: load._id.toString(), companyId: load.companyId.toString() })

    res.status(StatusCodes.CREATED).json(load)
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/loads/stream
 * Global SSE channel: pings all connected clients whenever a new load is posted.
 */
export const streamNewLoads = async (req: Request, res: Response) => {
  initSSE(res)
  const keepAlive = startSSEKeepAlive(res)
  const unsubscribe = onLoadPosted((payload) => sendSSE(res, payload))

  req.on('close', () => {
    clearInterval(keepAlive)
    unsubscribe()
    res.end()
  })
}

/**
 * PATCH /api/loads/:loadId
 * Update editable fields on an existing load.
 */
export const updateLoad = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { loadId } = req.params

    const load = await LoadModel.findByIdAndUpdate(loadId, req.body, {
      new: true,
      runValidators: true,
    })

    if (!load) {
      res.status(StatusCodes.NOT_FOUND).json({ message: 'Load not found' })
      return
    }

    res.status(StatusCodes.OK).json(load)
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/company/:companyId/loads
 * List all loads for a specific company.
 */
export const listCompanyLoads = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId } = req.params

    const loads = await LoadModel.find({ companyId })
      .sort({ createdAt: -1 })
      .populate('assignedDriverId')
      .populate('auctionId')
      .populate('companyId')

    res.status(StatusCodes.OK).json(loads)
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/loads
 * List loads that are currently live on the auction board.
 * Supports optional ?status= query filter.
 */
export const listAvailableLoads = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filter: Record<string, unknown> = {}

    // Default to auction_live; allow override via query param
    if (req.query.status) {
      filter.status = req.query.status
    } else {
      filter.status = LOAD_STATUSES.AuctionLive
    }

    const loads = await LoadModel.find(filter)
      .sort({ createdAt: -1 })
      .populate('companyId')
      .populate('auctionId')

    res.status(StatusCodes.OK).json(loads)
  } catch (err) {
    next(err)
  }
}
