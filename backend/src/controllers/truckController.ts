import { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import * as truckService from '../services/truckService'

/**
 * GET /api/driver/:driverId/trucks
 * Fetch all trucks for a driver.
 */
export const listDriverTrucks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const driverId = req.params.driverId as string
    const trucks = await truckService.listTrucks(driverId)
    res.status(StatusCodes.OK).json(trucks)
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/driver/:driverId/trucks/:truckId
 * Fetch a single truck by ID.
 */
export const getTruck = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const driverId = req.params.driverId as string
    const truckId = req.params.truckId as string
    const truck = await truckService.getTruck(driverId, truckId)
    res.status(StatusCodes.OK).json(truck)
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/driver/:driverId/trucks
 * Create a new truck for a driver.
 */
export const createTruck = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const driverId = req.params.driverId as string
    const truck = await truckService.createTruck(driverId, req.body)
    res.status(StatusCodes.CREATED).json(truck)
  } catch (err) {
    next(err)
  }
}

/**
 * PATCH /api/driver/:driverId/trucks/:truckId
 * Update fields on an existing truck.
 */
export const updateTruck = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const driverId = req.params.driverId as string
    const truckId = req.params.truckId as string
    const truck = await truckService.updateTruck(driverId, truckId, req.body)
    res.status(StatusCodes.OK).json(truck)
  } catch (err) {
    next(err)
  }
}

/**
 * DELETE /api/driver/:driverId/trucks/:truckId
 * Delete a truck from the driver's fleet.
 */
export const deleteTruck = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const driverId = req.params.driverId as string
    const truckId = req.params.truckId as string
    await truckService.deleteTruck(driverId, truckId)
    res.status(StatusCodes.NO_CONTENT).send()
  } catch (err) {
    next(err)
  }
}

/**
 * PATCH /api/driver/:driverId/trucks/:truckId/primary
 * Set a specific truck as the primary truck for a driver.
 */
export const setPrimaryTruck = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const driverId = req.params.driverId as string
    const truckId = req.params.truckId as string
    const truck = await truckService.setPrimaryTruck(driverId, truckId)
    res.status(StatusCodes.OK).json(truck)
  } catch (err) {
    next(err)
  }
}
