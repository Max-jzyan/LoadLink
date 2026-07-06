import { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import * as loadService from '../services/loadService'

/**
 * GET /api/loads/:loadId
 * Fetch a single load by its ID.
 */
export const getLoad = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { loadId } = req.params
    const load = await loadService.getLoad(loadId as string)
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
    const load = await loadService.createLoad(companyId, req.body)
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
  const { initSSE, sendSSE, startSSEKeepAlive } = await import('../utils/sse')
  const { onLoadPosted } = await import('../events/auctionEvents')

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
    const load = await loadService.updateLoad(loadId as string, req.body)
    res.status(StatusCodes.OK).json(load)
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/company/:companyId/loads
 * List all loads for a specific company.
 * Optional query: ?assignedDriverId=<id> to filter by driver.
 * Optional query: ?excludeReviewedBy=<id> to exclude already-reviewed loads.
 */
export const listCompanyLoads = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId } = req.params
    const options = {
      assignedDriverId: req.query.assignedDriverId as string | undefined,
      excludeReviewedBy: req.query.excludeReviewedBy as string | undefined,
    }
    const loads = await loadService.listCompanyLoads(companyId as string, options)
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
    const status = req.query.status as string | undefined
    const loads = await loadService.listAvailableLoads(status)
    res.status(StatusCodes.OK).json(loads)
  } catch (err) {
    next(err)
  }
}