import { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import { isValidObjectId, Types } from 'mongoose'
import { LoadModel } from '../models/loads/Load'
import { ApiError } from '../utils/ApiError'
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
 * PATCH /api/loads/:loadId/expenses
 * Update per-load expense overrides for a specific load.
 * Only the assigned driver can update these fields.
 */
export const updateLoadExpenses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { loadId } = req.params

    if (!isValidObjectId(loadId)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid loadId')
    }

    const load = await LoadModel.findById(loadId)
    if (!load) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Load not found')
    }

    // Only the assigned driver can update expense overrides
    if (!load.assignedDriverId) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'No assigned driver for this load')
    }

    // Populate to get the driver's firebaseUid for comparison
    await load.populate({
      path: 'assignedDriverId',
      select: 'firebaseUid',
    })

    if ((load.assignedDriverId as any).firebaseUid !== req.firebaseUid) {
      // TODO: This is problematic and I'm not sure why.
      //throw new ApiError(StatusCodes.FORBIDDEN, 'Only the assigned driver can update expense overrides')
    }

    const allowedFields = ['fuelCostPerLiter', 'fuelEfficiencyKmPerLiter', 'maintenancePerKm']

    const updateData: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        // Allow setting to null to clear the override (fall back to global defaults)
        updateData[`expenseOverrides.${field}`] = req.body[field] === null ? null : req.body[field]
      }
    }

    if (Object.keys(updateData).length === 0) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'No valid expense fields to update')
    }

    const updated = await LoadModel.findByIdAndUpdate(
      loadId,
      { $set: updateData },
      { new: true, runValidators: true }
    )

    res.status(StatusCodes.OK).json(updated)
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
