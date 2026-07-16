import { StatusCodes } from 'http-status-codes'
import { isValidObjectId, Types } from 'mongoose'
import { RatingCategories } from '../models/ratings/Rating'
import { ReviewModel, TARGET_TYPES, TargetType } from '../models/ratings/Review'
import { CompanyModel } from '../models/users/Company'
import { DriverModel } from '../models/users/Driver'
import { LoadModel } from '../models/loads/Load'
import { LOAD_STATUSES } from '../models/enums'
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
  categories: {
    timeliness: 0,
    communication: 0,
    reliability: 0,
    professionalism: 0,
    documentationAccuracy: 0,
  },
  lastUpdatedAt: new Date(),
})

/**
 * Recalculate the ratingSummary for a target user (Driver or Company)
 * by aggregating all reviews left for them. Falls back to zeros when
 * no reviews exist.
 */
export const recalculateRatingSummary = async (targetId: string, targetType: TargetType) => {
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
        // overallAverage computed in JS below from the 5 category averages
        // (MongoDB $avg is a unary operator and does not accept an array)
      },
    },
  ])

  // aggregated will be undefined when no reviews matched (the $group produces zero docs)
  const summaryData = aggregated
    ? {
        // Compute overall average from the 5 category averages
        average: round1(
          (aggregated.avgTimeliness +
            aggregated.avgCommunication +
            aggregated.avgReliability +
            aggregated.avgProfessionalism +
            aggregated.avgDocumentationAccuracy) /
            5
        ),
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
export const createReview = async (data: {
  reviewerId: string
  targetId: string
  targetType: TargetType
  loadId: string
  ratingCategories: RatingCategories
  comment?: string
}) => {
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

  // Keep the target's rating summary up to date
  await recalculateRatingSummary(data.targetId, data.targetType)

  return review
}

/**
 * Create a review from a company reviewing a driver.
 * Validates that the reviewerId belongs to a company document.
 * Enforces one review per (reviewer, load) pair.
 */
export const createCompanyReview = async (data: {
  reviewerId: string
  targetId: string
  loadId: string
  ratingCategories: RatingCategories
  comment?: string
}) => {
  assertValidId(data.reviewerId, 'reviewerId')
  assertValidId(data.targetId, 'targetId')
  assertValidId(data.loadId, 'loadId')

  // Verify the reviewer is a company
  const company = await CompanyModel.findById(data.reviewerId)
  if (!company) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only companies can review drivers')
  }

  if (data.reviewerId === data.targetId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Cannot review yourself')
  }

  // Verify the load is a completed load assigned to the target driver and
  // owned by the reviewing company. This enforces that a company can only
  // review a driver for a load the driver has actually completed for them.
  const load = await LoadModel.findById(data.loadId)
  if (!load) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Load not found')
  }
  if (load.status !== LOAD_STATUSES.Completed) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'You can only review drivers for completed loads')
  }
  if (!load.assignedDriverId || load.assignedDriverId.toString() !== data.targetId) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'You can only review a driver for a load assigned to them'
    )
  }
  if (load.companyId.toString() !== data.reviewerId) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You can only review drivers for loads belonging to your company'
    )
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
    targetType: TARGET_TYPES.DRIVER,
    loadId: new Types.ObjectId(data.loadId),
    ratingCategories: data.ratingCategories,
    comment: data.comment ?? '',
  })

  // Keep the target's rating summary up to date
  await recalculateRatingSummary(data.targetId, TARGET_TYPES.DRIVER)

  return review
}

/**
 * Create a review from a driver reviewing a company.
 * Validates that the reviewerId belongs to a driver document.
 * Enforces one review per (reviewer, load) pair.
 */
export const createDriverReview = async (data: {
  reviewerId: string
  targetId: string
  loadId: string
  ratingCategories: RatingCategories
  comment?: string
}) => {
  assertValidId(data.reviewerId, 'reviewerId')
  assertValidId(data.targetId, 'targetId')
  assertValidId(data.loadId, 'loadId')

  // Verify the reviewer is a driver
  const driver = await DriverModel.findById(data.reviewerId)
  if (!driver) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Only drivers can review companies')
  }

  if (data.reviewerId === data.targetId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Cannot review yourself')
  }

  // Verify the load is a completed load assigned to the reviewing driver and
  // owned by the target company. This enforces that a driver can only
  // review a company for a load they have actually completed for them.
  const load = await LoadModel.findById(data.loadId)
  if (!load) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Load not found')
  }
  if (load.status !== LOAD_STATUSES.Completed) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'You can only review companies for completed loads')
  }
  if (!load.assignedDriverId || load.assignedDriverId.toString() !== data.reviewerId) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'You can only review a company for a load assigned to you'
    )
  }
  if (load.companyId.toString() !== data.targetId) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You can only review a company for a load belonging to them'
    )
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
    targetType: TARGET_TYPES.COMPANY,
    loadId: new Types.ObjectId(data.loadId),
    ratingCategories: data.ratingCategories,
    comment: data.comment ?? '',
  })

  // Keep the target's rating summary up to date
  await recalculateRatingSummary(data.targetId, TARGET_TYPES.COMPANY)

  return review
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
