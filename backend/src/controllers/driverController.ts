import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import * as driverService from '../services/driverService'

// ── endpoints ────────────────────────────────────────────────────────────

/**
 * GET /api/driver/:driverId/bids
 * List all bids placed by a driver. Optional ?status= query filter.
 */
export const listDriverBids = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const driverId = req.params.driverId as string
    const status = req.query.status as string | undefined
    const bids = await driverService.listDriverBids(driverId, status)
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
    const status = req.query.status as string | undefined
    const loads = await driverService.listDriverLoads(driverId, status)
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
    const loads = await driverService.getRecommendedLoads(driverId)
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
    const trucks = await driverService.listDriverTrucks(driverId)
    res.status(StatusCodes.OK).json(trucks)
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/driver/:driverId/profile
 * Fetch the full driver profile document with user-level fields merged in.
 */
export const getDriverProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const driverId = req.params.driverId as string
    const driver = await driverService.getDriverProfile(driverId)
    res.status(StatusCodes.OK).json(driver)
  } catch (err) {
    next(err)
  }
}

/**
 * PATCH /api/driver/:driverId/profile
 * Update editable fields on a driver's profile.
 */
export const updateDriverProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const driverId = req.params.driverId as string
    const driver = await driverService.updateDriverProfile(driverId, req.body)
    res.status(StatusCodes.OK).json(driver)
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/driver/:driverId/revenue
 * Aggregate completed loads and compute revenue, expenses, and profit.
 * Optional query params: dateFrom, dateTo, truckType, minPayout, maxPayout, origin, destination, minDistance, maxDistance
 */
export const getDriverRevenue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const driverId = req.params.driverId as string
    const summary = await driverService.getDriverRevenue(driverId, req.query as Record<string, unknown>)
    res.status(StatusCodes.OK).json(summary)
  } catch (err) {
    next(err)
  }
}

/**
 * PATCH /api/driver/:driverId/expenses
 * Update the driver's expense preferences.
 */
export const updateDriverExpenses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const driverId = req.params.driverId as string
    const driver = await driverService.updateDriverExpenses(driverId, req.body)
    res.status(StatusCodes.OK).json(driver)
  } catch (err) {
    next(err)
  }
}