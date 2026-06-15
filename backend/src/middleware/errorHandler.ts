import { ErrorRequestHandler } from 'express'
import { StatusCodes } from 'http-status-codes'
import { ApiError } from '../utils/ApiError'

/**
 * Central error-handling middleware. Maps thrown `ApiError`s to their status code,
 * and anything else to a 500. Mounted last in `index.ts`.
 */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({ message: err.message })
    return
  }

  console.error(err)
  res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Internal server error' })
}
