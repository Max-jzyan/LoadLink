import { StatusCodes } from 'http-status-codes'
import { isValidObjectId, Types } from 'mongoose'
import { RatingCategories } from '../models/ratings/Ratings'
import { ReviewModel, TARGET_TYPES, TargetType } from '../models/ratings/Review'
import { CompanyModel } from '../models/users/Company'
import { DriverModel } from '../models/users/Driver'
import { ApiError } from '../utils/ApiError'

const assertValidId = (id: string, label: string) => {
  if (!isValidObjectId(id)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, `Invalid ${label}`)
  }
}

/** Round a number to 1 decimal place */
const round1 = (n: number) => Math.round(n * 10) / 10

/** Default empty rating summary used when a user has no reviews yet. */
const emptyRatingSummary = () => ({
  average: 0,
  totalReviews: 0,
  categories: { timeliness: 0, communication: 0, reliability: 0, professionalism: 0, documentationAccuracy: 0 },
  lastUpdatedAt: new Date(),
})

/**
 * Recalculate the ratingSummary for a target user (Driver or Company)
 * by aggregating all reviews left for them. Falls back to zeros when
 * no reviews exist.
 */
const recalculateRatingSummary = async (targetId: string, targetType: TargetType) => {
  const [aggregated] = await ReviewModel.aggregate([
    { $match: { targetId: new Types.ObjectId(targetId) } },
    {
      $group: {
        _id: null,
        totalReviews: { $sum: 1 },
        avgTimeliness: { $avg: '$ratingCategories.timeliness' },
        avgCommunication: { $avg: '$ratingCategories.communication' },
        avgReliability: { $avg: '$ratingCategories.reliability' },
        avgProfessionalism: { $avg: '$ratingCategories.professionalism' },
        avgDocumentationAccuracy: { $avg: '$ratingCategories.documentationAccuracy' },
        overallAverage: {
          $avg: [
            '$ratingCategories.timeliness',
            '$ratingCategories.communication',
            '$ratingCategories.reliability',
            '$ratingCategories.professionalism',
            '$ratingCategories.documentationAccuracy',
          ],
        },
      },
    },
  ])

  // aggregated will be undefined when no reviews matched (the $group produces zero docs)
  const summaryData = aggregated
    ? {
        average: round1(aggregated.overallAverage),
        totalReviews: aggregated.totalReviews,
        categories: {
          timeliness: round1(aggregated.avgTimeliness),
          communication: round1(aggregated.avgCommunication),
          reliability: round1(aggregated.avgReliability),
          professionalism: round1(aggregated.avgProfessionalism),
          documentationAccuracy: round1(aggregated.avgDocumentationAccuracy),
        } as RatingCategories,
        lastUpdatedAt: new Date(),
      }
    : emptyRatingSummary()

  if (targetType === TARGET_TYPES.DRIVER) {
    await DriverModel.findByIdAndUpdate(targetId, { ratingSummary: summaryData })
  } else {
    await CompanyModel.findByIdAndUpdate(targetId, { ratingSummary: summaryData })
  }
}

/**
 * Create a new review. Enforces one review per (reviewer, load) pair.
 */
export const createReview = async (
  data: {
    reviewerId: string
    targetId: string
    targetType: TargetType
    loadId: string
    ratingCategories: RatingCategories
    comment?: string
  }
) => {
  assertValidId(data.reviewerId, 'reviewerId')
  assertValidId(data.targetId, 'targetId')
  assertValidId(data.loadId, 'loadId')

  if (data.reviewerId === data.targetId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Cannot review yourself')
  }

  if (![TARGET_TYPES.DRIVER, TARGET_TYPES.COMPANY].includes(data.targetType)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'targetType must be "driver" or "company"')
  }

  // Validate each rating category is within 0-5
  for (const [key, value] of Object.entries(data.ratingCategories)) {
    if (typeof value !== 'number' || value < 0 || value > 5) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        `Rating "${key}" must be a number between 0 and 5`
      )
    }
  }

  // Check the unique constraint explicitly for a better error message
  const existing = await ReviewModel.findOne({
    reviewerId: new Types.ObjectId(data.reviewerId),
    loadId: new Types.ObjectId(data.loadId),
  })

  if (existing) {
    throw new ApiError(StatusCodes.CONFLICT, 'You have already reviewed this load')
  }

  const review = await ReviewModel.create({
    reviewerId: new Types.ObjectId(data.reviewerId),
    targetId: new Types.ObjectId(data.targetId),
    targetType: data.targetType,
    loadId: new Types.ObjectId(data.loadId),
    ratingCategories: data.ratingCategories,
    comment: data.comment ?? '',
  })

  const savedReview = await review.save()

  // Keep the target's rating summary up to date
  await recalculateRatingSummary(data.targetId, data.targetType)

  return savedReview
}

/**
 * Fetch paginated reviews for a target user.
 */
export const getReviewsForTarget = async (
  targetId: string,
  options?: { page?: number; limit?: number }
) => {
  assertValidId(targetId, 'targetId')

  const page = Math.max(1, options?.page ?? 1)
  const limit = Math.min(50, Math.max(1, options?.limit ?? 20))
  const skip = (page - 1) * limit

  const [reviews, total] = await Promise.all([
    ReviewModel.find({ targetId: new Types.ObjectId(targetId) })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('reviewerId', 'name email')
      .populate('loadId', 'originAddress destinationAddress'),
    ReviewModel.countDocuments({ targetId: new Types.ObjectId(targetId) }),
  ])

  return {
    data: reviews,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

/**
 * Fetch a single review by ID.
 */
export const getReview = async (reviewId: string) => {
  assertValidId(reviewId, 'reviewId')

  const review = await ReviewModel.findById(reviewId)
    .populate('reviewerId', 'name email')
    .populate('targetId', 'name email')
    .populate('loadId', 'originAddress destinationAddress')

  if (!review) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Review not found')
  }

  return review
}

/**
 * Delete a review and recalculate the target's rating summary.
 */
export const deleteReview = async (reviewId: string) => {
  assertValidId(reviewId, 'reviewId')

  const review = await ReviewModel.findByIdAndDelete(reviewId)

  if (!review) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Review not found')
  }

  await recalculateRatingSummary(review.targetId.toString(), review.targetType as TargetType)
}