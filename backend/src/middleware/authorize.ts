import type { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import { isValidObjectId } from 'mongoose'
import { ApiError } from '../utils/ApiError'
import { LoadModel } from '../models/loads/Load'
import { ReviewModel } from '../models/ratings/Review'
import type { UserRole } from '../models/enums'
import type { AuthedUser } from '../types/auth'

/**
 * All guards in this file assume `requireAuth` has already run and populated
 * `req.user`.
 */

function ensureUser(req: Request): AuthedUser {
  if (!req.user) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Authentication required')
  }
  return req.user
}

// Eg: requireRole('company')` or `requireRole('company', 'admin')`.
export const requireRole =
  (...roles: UserRole[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    try {
      const user = ensureUser(req)
      if (!roles.includes(user.role)) {
        return next(new ApiError(StatusCodes.FORBIDDEN, 'Forbidden: insufficient role'))
      }
      next()
    } catch (err) {
      next(err)
    }
  }

// Make sure user A can only access user A resources, when it is user/:userid
export const requireSelfParam =
  (paramName: string) => (req: Request, _res: Response, next: NextFunction) => {
    try {
      const user: AuthedUser = ensureUser(req)
      if (req.params[paramName] !== user._id) {
        return next(new ApiError(StatusCodes.FORBIDDEN, 'Forbidden: not your resource'))
      }
      next()
    } catch (err) {
      next(err)
    }
  }

// Make sure user A can access the object belong to user A, when it is user/:load
export const requireOwns =
  (loader: (req: Request) => Promise<string | null>) =>
  async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const user = ensureUser(req)
      const ownerId = await loader(req)
      if (ownerId === null) {
        return next(new ApiError(StatusCodes.NOT_FOUND, 'Resource not found'))
      }
      if (ownerId !== user._id) {
        return next(new ApiError(StatusCodes.FORBIDDEN, 'Forbidden: not your resource'))
      }
      next()
    } catch (err) {
      next(err)
    }
  }

/** Owner of the load at `:loadId` is its company. */
export const companyOwnsLoad = async (req: Request): Promise<string | null> => {
  const { loadId } = req.params
  if (!isValidObjectId(loadId)) return null
  const load = await LoadModel.findById(loadId).select('companyId')
  return load?.companyId ? load.companyId.toString() : null
}

/** Owner of the load at `:loadId` is its assigned driver. */
export const driverOwnsAssignedLoad = async (req: Request): Promise<string | null> => {
  const { loadId } = req.params
  if (!isValidObjectId(loadId)) return null
  const load = await LoadModel.findById(loadId).select('assignedDriverId')
  return load?.assignedDriverId ? load.assignedDriverId.toString() : null
}

/** Owner of the review at `:reviewId` is its author (reviewerId). */
export const reviewOwnedByCaller = async (req: Request): Promise<string | null> => {
  const { reviewId } = req.params
  if (!isValidObjectId(reviewId)) return null
  const review = await ReviewModel.findById(reviewId).select('reviewerId')
  return review?.reviewerId ? review.reviewerId.toString() : null
}
