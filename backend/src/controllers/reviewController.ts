import { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import * as reviewService from '../services/reviewService'

/**
 * POST /api/reviews
 * Create a new review — only companies can review drivers.
 * Body: { reviewerId, targetId, loadId, ratingCategories, comment? }
 * The service layer validates that reviewerId belongs to a company.
 */
export const createReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const review = await reviewService.createCompanyReview(req.body)
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
