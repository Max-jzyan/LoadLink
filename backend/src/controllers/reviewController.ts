import { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import { TARGET_TYPES, TargetType } from '../models/ratings/Review'
import * as reviewService from '../services/reviewService'

/**
 * POST /api/reviews
 * Create a new review. Accepts targetType in the body:
 *   - targetType: 'driver'  → a company is reviewing a driver
 *   - targetType: 'company' → a driver is reviewing a company
 * Body: { reviewerId, targetId, loadId, ratingCategories, comment?, targetType? }
 * targetType defaults to 'driver' for backward compatibility.
 */
export const createReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reviewerId = req.user!._id
    const targetType: TargetType = req.body.targetType || TARGET_TYPES.DRIVER

    let review
    if (targetType === TARGET_TYPES.COMPANY) {
      review = await reviewService.createDriverReview({ ...req.body, reviewerId })
    } else {
      review = await reviewService.createCompanyReview({ ...req.body, reviewerId })
    }
    res.status(StatusCodes.CREATED).json(review)
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/reviews/target/:targetId
 * Fetch paginated reviews for a target user.
 * Query: ?page=1&limit=20
 */
export const getReviewsForTarget = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const targetId = req.params.targetId as string
    const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined

    const result = await reviewService.getReviewsForTarget(targetId, { page, limit })
    res.status(StatusCodes.OK).json(result)
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/reviews/:reviewId
 * Fetch a single review by its ID.
 */
export const getReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reviewId = req.params.reviewId as string
    const review = await reviewService.getReview(reviewId)
    res.status(StatusCodes.OK).json(review)
  } catch (err) {
    next(err)
  }
}

/**
 * DELETE /api/reviews/:reviewId
 * Delete a review and recalculate the target user's rating summary.
 */
export const deleteReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reviewId = req.params.reviewId as string
    await reviewService.deleteReview(reviewId)
    res.status(StatusCodes.NO_CONTENT).send()
  } catch (err) {
    next(err)
  }
}
