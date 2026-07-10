import { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import * as trailerService from '../services/trailerService'

export const listDriverTrailers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const trailers = await trailerService.listTrailers(req.params.driverId as string)
    res.status(StatusCodes.OK).json(trailers)
  } catch (err) {
    next(err)
  }
}

export const getTrailer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const trailer = await trailerService.getTrailer(
      req.params.driverId as string,
      req.params.trailerId as string
    )
    res.status(StatusCodes.OK).json(trailer)
  } catch (err) {
    next(err)
  }
}

export const createTrailer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const trailer = await trailerService.createTrailer(req.params.driverId as string, req.body)
    res.status(StatusCodes.CREATED).json(trailer)
  } catch (err) {
    next(err)
  }
}

export const updateTrailer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const trailer = await trailerService.updateTrailer(
      req.params.driverId as string,
      req.params.trailerId as string,
      req.body
    )
    res.status(StatusCodes.OK).json(trailer)
  } catch (err) {
    next(err)
  }
}

export const deleteTrailer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await trailerService.deleteTrailer(
      req.params.driverId as string,
      req.params.trailerId as string
    )
    res.status(StatusCodes.NO_CONTENT).send()
  } catch (err) {
    next(err)
  }
}
