import { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import { isValidObjectId, Types } from 'mongoose'
import { LoadModel } from '../models/loads/Load'
import { ApiError } from '../utils/ApiError'
import * as loadService from '../services/loadService'
import { LOAD_STATUSES } from '../models/enums'

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
 * PATCH /api/driver/:driverId/loads/:loadId/status
 * Update the status of a load assigned to a driver.
 * Only the assigned driver can update the status.
 */
export const updateLoadStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { loadId } = req.params
    const driverId = req.user!._id

    if (!isValidObjectId(loadId)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid loadId')
    }

    const load = await LoadModel.findById(loadId)
    if (!load) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Load not found')
    }

    // Check if this driver is assigned to this load
    if (!load.assignedDriverId || load.assignedDriverId.toString() !== driverId) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Load is not assigned to this driver')
    }

    const allowedStatuses = [
      LOAD_STATUSES.InTransit,
      LOAD_STATUSES.Completed,
      LOAD_STATUSES.Booked,
      LOAD_STATUSES.Cancelled,
    ]
    if (!allowedStatuses.includes(req.body.status)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid status value')
    }

    const updated = await LoadModel.findByIdAndUpdate(
      loadId,
      { status: req.body.status },
      { new: true }
    )
    res.status(StatusCodes.OK).json(updated)
  } catch (err) {
    next(err)
  }
}

/**
 * PATCH /api/loads/:loadId/expenses
 * Update per-load expense overrides for a specific load.
 * Only the assigned driver can update these fields.
 * Note: requireOwns(driverOwnsAssignedLoad) middleware already validates driver ownership.
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

    // Check if there's an assigned driver (handled by middleware for ownership validation)
    if (!load.assignedDriverId) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'No assigned driver for this load')
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

/**
 * PATCH /api/loads/:loadId/select-truck
 * Assign (or clear) the truck a driver intends to use for a specific load.
 */
export const selectTruckForLoad = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const loadId = req.params.loadId as string

    // Resolve the driver id from the authenticated user (firebaseUid -> driver doc)
    const { DriverModel } = await import('../models/users/Driver')
    const driver = await DriverModel.findOne({ firebaseUid: req.firebaseUid })
    if (!driver) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Driver not found')
    }

    const truckId = req.body.truckId === undefined ? null : (req.body.truckId as string | null)
    // Cast driver._id to string - use String constructor to ensure proper type
    const driverId = String(driver._id as Types.ObjectId)
    const load = await loadService.selectTruckForLoad(loadId, driverId, truckId)
    res.status(StatusCodes.OK).json(load)
  } catch (err) {
    next(err)
  }
}
