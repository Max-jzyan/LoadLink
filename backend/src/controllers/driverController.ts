import { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import { isValidObjectId, Types } from 'mongoose'
import { BidModel } from '../models/loads/Bid'
import { LoadModel } from '../models/loads/Load'
import { TruckModel } from '../models/trucks/Truck'
import { LOAD_STATUSES } from '../models/enums'
import { ApiError } from '../utils/ApiError'

// ── helpers ──────────────────────────────────────────────────────────────

const assertValidId = (id: string, label: string) => {
  if (!isValidObjectId(id)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, `Invalid ${label}`)
  }
}

// ── endpoints ────────────────────────────────────────────────────────────

/**
 * GET /api/driver/:driverId/bids
 * List all bids placed by a driver. Optional ?status= query filter.
 */
export const listDriverBids = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const driverId = req.params.driverId as string
    assertValidId(driverId, 'driverId')

    const filter: Record<string, unknown> = { driverId: new Types.ObjectId(driverId) }
    if (req.query.status) {
      filter.status = req.query.status as string
    }

    const bids = await BidModel.find(filter)
      .sort({ createdAt: -1 })
      .populate('loadId')
      .populate('auctionId')

    res.status(StatusCodes.OK).json(bids)
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/driver/:driverId/loads
 * List loads assigned to a driver. Optional ?status= query filter.
 */
export const listDriverLoads = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const driverId = req.params.driverId as string
    assertValidId(driverId, 'driverId')

    const filter: Record<string, unknown> = { assignedDriverId: new Types.ObjectId(driverId) }
    if (req.query.status) {
      filter.status = req.query.status as string
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

/**
 * GET /api/driver/:driverId/recommended-loads
 * Fetch loads that match the driver's truck type(s) and are currently on auction.
 */
export const getRecommendedLoads = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const driverId = req.params.driverId as string
    assertValidId(driverId, 'driverId')

    // Fetch the driver's truck types for matching
    const trucks = await TruckModel.find({ ownerDriverId: new Types.ObjectId(driverId) }).lean()
    const truckTypes = [...new Set(trucks.map((t) => t.truckType))]

    const filter: Record<string, unknown> = {
      status: LOAD_STATUSES.AuctionLive,
    }

    // If the driver has trucks, filter by matching truck types
    if (truckTypes.length > 0) {
      filter.truckType = { $in: truckTypes }
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

/**
 * GET /api/driver/:driverId/trucks
 * Fetch all trucks registered to a driver.
 */
export const listDriverTrucks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const driverId = req.params.driverId as string
    assertValidId(driverId, 'driverId')

    const trucks = await TruckModel.find({ ownerDriverId: new Types.ObjectId(driverId) })
      .sort({ isPrimary: -1, createdAt: -1 })

    res.status(StatusCodes.OK).json(trucks)
  } catch (err) {
    next(err)
  }
}