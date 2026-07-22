import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import * as driverService from '../services/driverService'
import * as aiInsightsService from '../services/aiInsightsService'
import { parseLatLng } from '../utils/geo'

/**
 * GET /api/driver/:driverId/conflicting-bids/:loadId
 * Return any submitted bids whose loads have scheduling overlap with the target load.
 */
export const getConflictingBids = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const driverId = req.params.driverId as string
    const loadId = req.params.loadId as string
    const conflicts = await driverService.getConflictingBids(driverId, loadId)
    res.status(StatusCodes.OK).json(conflicts)
  } catch (err) {
    next(err)
  }
}

/**
 * DELETE /api/driver/:driverId/documents/:docKey
 * Remove a certification document from the driver's profile (by S3 key).
 */
export const removeCertificationDocument = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const driverId = req.params.driverId as string
    const docKey = decodeURIComponent(req.params.docKey as string)
    await driverService.removeCertificationDocument(driverId, docKey)
    res.status(StatusCodes.NO_CONTENT).send()
  } catch (err) {
    next(err)
  }
}

/**
 * DELETE /api/driver/:driverId/insurance/:idx
 * Remove an insurance certificate by array index.
 */
export const removeInsuranceCertificate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const driverId = req.params.driverId as string
    const idx = parseInt(req.params.idx as string, 10)
    await driverService.removeInsuranceCertificate(driverId, idx)
    res.status(StatusCodes.NO_CONTENT).send()
  } catch (err) {
    next(err)
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
 * GET /api/driver/:driverId/completed-loads/:companyId
 * List completed loads for a driver that are eligible for review for a specific company.
 * Excludes loads already reviewed by the driver.
 */
export const listDriverCompletedLoadsForCompany = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const driverId = req.params.driverId as string
    const companyId = req.params.companyId as string
    const loads = await driverService.listDriverCompletedLoadsForCompany(driverId, companyId)
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
    const summary = await driverService.getDriverRevenue(
      driverId,
      req.query as Record<string, unknown>
    )
    res.status(StatusCodes.OK).json(summary)
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/driver/:driverId/loads/scored
 * Fetch all available loads with eligibility flags and recommendation scores.
 * Optional `lat`/`lng` query params override the inferred current location
 * (e.g. from the browser's Geolocation API) for deadhead/proximity scoring.
 */
export const getScoredLoads = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const driverId = req.params.driverId as string
    const liveLocation = parseLatLng(req.query.lat, req.query.lng)
    const scored = await driverService.getScoredLoads(driverId, liveLocation)
    res.status(StatusCodes.OK).json(scored)
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/driver/:driverId/ai-insights
 * Returns an AI-generated natural-language insight about the driver's top recommended loads.
 * Responds with { available: false } when OPENROUTER_API_KEY is not set — the frontend
 * hides the feature entirely in that case so nothing breaks.
 */
export const getAiInsights = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const driverId = req.params.driverId as string
    const result = await aiInsightsService.getLoadInsight(driverId)
    res.status(StatusCodes.OK).json(result)
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/driver/:driverId/ai-insights/fuel-stops?loadId=<id>
 * Returns AI-suggested fuel stop cities for a specific load's route.
 * Responds with { available: false } when OPENROUTER_API_KEY is not set.
 */
export const getAiFuelStops = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const loadId = req.query.loadId as string | undefined
    if (!loadId) {
      res.status(StatusCodes.OK).json({ available: false })
      return
    }
    const result = await aiInsightsService.getFuelStopSuggestions(loadId)
    res.status(StatusCodes.OK).json(result)
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/driver/:driverId/ai-insights/rest-areas?loadId=<id>
 * Returns AI-suggested truck rest area stops for a specific load's route.
 * Responds with { available: false } when OPENROUTER_API_KEY is not set.
 */
export const getAiRestAreas = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const loadId = req.query.loadId as string | undefined
    if (!loadId) {
      res.status(StatusCodes.OK).json({ available: false })
      return
    }
    const result = await aiInsightsService.getRestAreaSuggestions(loadId)
    res.status(StatusCodes.OK).json(result)
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
