import { StatusCodes } from 'http-status-codes'
import { ReviewModel, TARGET_TYPES } from '../../models/ratings/Review'
import { CompanyModel } from '../../models/users/Company'
import { DriverModel } from '../../models/users/Driver'
import {
  recalculateRatingSummary,
  createReview,
  createCompanyReview,
  getReviewsForTarget,
  getReview,
  deleteReview,
} from '../reviewService'

jest.mock('../../models/ratings/Review')
// DriverModel declares a virtual getter and CompanyModel is a discriminator;
// jest's automock chokes on both, so provide minimal manual mocks.
jest.mock('../../models/users/Driver', () => ({ DriverModel: { findByIdAndUpdate: jest.fn() } }))
jest.mock('../../models/users/Company', () => ({
  CompanyModel: { findByIdAndUpdate: jest.fn(), findById: jest.fn() },
}))

const aggregateMock = jest.mocked(ReviewModel.aggregate)
const findOneReviewMock = jest.mocked(ReviewModel.findOne)
const createReviewMock = jest.mocked(ReviewModel.create)
const findReviewMock = jest.mocked(ReviewModel.find)
const countReviewMock = jest.mocked(ReviewModel.countDocuments)
const findReviewByIdMock = jest.mocked(ReviewModel.findById)
const findReviewByIdAndDeleteMock = jest.mocked(ReviewModel.findByIdAndDelete)
const findDriverByIdAndUpdateMock = jest.mocked(DriverModel.findByIdAndUpdate)
const findCompanyByIdAndUpdateMock = jest.mocked(CompanyModel.findByIdAndUpdate)
const findCompanyByIdMock = jest.mocked(CompanyModel.findById)

const REVIEWER_ID = '000000000000000000000001'
const TARGET_ID = '000000000000000000000011'
const LOAD_ID = '000000000000000000000101'
const INVALID_ID = 'not-an-object-id'

function validRatingCategories() {
  return {
    timeliness: 4,
    communication: 5,
    reliability: 4,
    professionalism: 5,
    documentationAccuracy: 4,
  }
}

beforeEach(() => {
  jest.resetAllMocks()
})

describe('recalculateRatingSummary', () => {
  it('writes zeroed-out summary fields when there are no reviews', async () => {
    aggregateMock.mockResolvedValue([])

    await recalculateRatingSummary(TARGET_ID, TARGET_TYPES.DRIVER)

    expect(findDriverByIdAndUpdateMock).toHaveBeenCalledWith(TARGET_ID, {
      ratingSummary: expect.objectContaining({ average: 0, totalReviews: 0 }),
    })
  })

  it('computes the average across categories and writes to Company for company targets', async () => {
    aggregateMock.mockResolvedValue([
      {
        totalReviews: 2,
        avgTimeliness: 4,
        avgCommunication: 5,
        avgReliability: 3,
        avgProfessionalism: 5,
        avgDocumentationAccuracy: 3,
      },
    ])

    await recalculateRatingSummary(TARGET_ID, TARGET_TYPES.COMPANY)

    expect(findCompanyByIdAndUpdateMock).toHaveBeenCalledWith(TARGET_ID, {
      ratingSummary: expect.objectContaining({
        average: 4,
        totalReviews: 2,
        categories: {
          timeliness: 4,
          communication: 5,
          reliability: 3,
          professionalism: 5,
          documentationAccuracy: 3,
        },
      }),
    })
    expect(findDriverByIdAndUpdateMock).not.toHaveBeenCalled()
  })
})

describe('createReview', () => {
  it('400s on invalid ids', async () => {
    await expect(
      createReview({
        reviewerId: INVALID_ID,
        targetId: TARGET_ID,
        targetType: TARGET_TYPES.DRIVER,
        loadId: LOAD_ID,
        ratingCategories: validRatingCategories(),
      })
    ).rejects.toMatchObject({ statusCode: StatusCodes.BAD_REQUEST })
  })

  it('400s when reviewing yourself', async () => {
    await expect(
      createReview({
        reviewerId: REVIEWER_ID,
        targetId: REVIEWER_ID,
        targetType: TARGET_TYPES.DRIVER,
        loadId: LOAD_ID,
        ratingCategories: validRatingCategories(),
      })
    ).rejects.toMatchObject({ statusCode: StatusCodes.BAD_REQUEST })
  })

  it('400s on an invalid targetType', async () => {
    await expect(
      createReview({
        reviewerId: REVIEWER_ID,
        targetId: TARGET_ID,
        targetType: 'admin' as never,
        loadId: LOAD_ID,
        ratingCategories: validRatingCategories(),
      })
    ).rejects.toMatchObject({ statusCode: StatusCodes.BAD_REQUEST })
  })

  it('400s when a rating category is out of range', async () => {
    await expect(
      createReview({
        reviewerId: REVIEWER_ID,
        targetId: TARGET_ID,
        targetType: TARGET_TYPES.DRIVER,
        loadId: LOAD_ID,
        ratingCategories: { ...validRatingCategories(), timeliness: 6 },
      })
    ).rejects.toMatchObject({ statusCode: StatusCodes.BAD_REQUEST })
  })

  it('409s when the reviewer already reviewed this load', async () => {
    findOneReviewMock.mockResolvedValue({ _id: 'existing' } as never)

    await expect(
      createReview({
        reviewerId: REVIEWER_ID,
        targetId: TARGET_ID,
        targetType: TARGET_TYPES.DRIVER,
        loadId: LOAD_ID,
        ratingCategories: validRatingCategories(),
      })
    ).rejects.toMatchObject({ statusCode: StatusCodes.CONFLICT })
  })

  it('creates the review and recalculates the target rating summary', async () => {
    findOneReviewMock.mockResolvedValue(null)
    createReviewMock.mockResolvedValue({ _id: 'new-review' } as never)
    aggregateMock.mockResolvedValue([])

    const review = await createReview({
      reviewerId: REVIEWER_ID,
      targetId: TARGET_ID,
      targetType: TARGET_TYPES.DRIVER,
      loadId: LOAD_ID,
      ratingCategories: validRatingCategories(),
    })

    expect(createReviewMock).toHaveBeenCalledWith(
      expect.objectContaining({ targetType: TARGET_TYPES.DRIVER, comment: '' })
    )
    expect(findDriverByIdAndUpdateMock).toHaveBeenCalled()
    expect(review).toEqual({ _id: 'new-review' })
  })
})

describe('createCompanyReview', () => {
  it('403s when the reviewer is not a registered company', async () => {
    findCompanyByIdMock.mockResolvedValue(null)

    await expect(
      createCompanyReview({
        reviewerId: REVIEWER_ID,
        targetId: TARGET_ID,
        loadId: LOAD_ID,
        ratingCategories: validRatingCategories(),
      })
    ).rejects.toMatchObject({ statusCode: StatusCodes.FORBIDDEN })
  })

  it('400s when reviewing yourself', async () => {
    findCompanyByIdMock.mockResolvedValue({ _id: REVIEWER_ID } as never)

    await expect(
      createCompanyReview({
        reviewerId: REVIEWER_ID,
        targetId: REVIEWER_ID,
        loadId: LOAD_ID,
        ratingCategories: validRatingCategories(),
      })
    ).rejects.toMatchObject({ statusCode: StatusCodes.BAD_REQUEST })
  })

  it('409s when the company already reviewed this load', async () => {
    findCompanyByIdMock.mockResolvedValue({ _id: REVIEWER_ID } as never)
    findOneReviewMock.mockResolvedValue({ _id: 'existing' } as never)

    await expect(
      createCompanyReview({
        reviewerId: REVIEWER_ID,
        targetId: TARGET_ID,
        loadId: LOAD_ID,
        ratingCategories: validRatingCategories(),
      })
    ).rejects.toMatchObject({ statusCode: StatusCodes.CONFLICT })
  })

  it('creates a driver-targeted review and recalculates the driver rating summary', async () => {
    findCompanyByIdMock.mockResolvedValue({ _id: REVIEWER_ID } as never)
    findOneReviewMock.mockResolvedValue(null)
    createReviewMock.mockResolvedValue({ _id: 'new-review' } as never)
    aggregateMock.mockResolvedValue([])

    await createCompanyReview({
      reviewerId: REVIEWER_ID,
      targetId: TARGET_ID,
      loadId: LOAD_ID,
      ratingCategories: validRatingCategories(),
    })

    expect(createReviewMock).toHaveBeenCalledWith(
      expect.objectContaining({ targetType: TARGET_TYPES.DRIVER })
    )
    expect(findDriverByIdAndUpdateMock).toHaveBeenCalled()
  })
})

describe('getReviewsForTarget', () => {
  it('400s on an invalid targetId', async () => {
    await expect(getReviewsForTarget(INVALID_ID)).rejects.toMatchObject({
      statusCode: StatusCodes.BAD_REQUEST,
    })
  })

  it('paginates and clamps the limit to 50', async () => {
    const populateMock = jest.fn().mockReturnThis()
    const limitMock = jest.fn().mockReturnValue({ populate: populateMock })
    const skipMock = jest.fn().mockReturnValue({ limit: limitMock })
    const sortMock = jest.fn().mockReturnValue({ skip: skipMock })
    findReviewMock.mockReturnValue({ sort: sortMock } as never)
    countReviewMock.mockResolvedValue(120)
    populateMock.mockReturnValueOnce({ populate: jest.fn().mockResolvedValue([]) })

    const result = await getReviewsForTarget(TARGET_ID, { page: 2, limit: 500 })

    expect(skipMock).toHaveBeenCalledWith(50) // (page 2 - 1) * limit(50, clamped)
    expect(limitMock).toHaveBeenCalledWith(50)
    expect(result.pagination).toEqual({ page: 2, limit: 50, total: 120, totalPages: 3 })
  })
})

describe('getReview', () => {
  it('400s on an invalid reviewId', async () => {
    await expect(getReview(INVALID_ID)).rejects.toMatchObject({
      statusCode: StatusCodes.BAD_REQUEST,
    })
  })

  it('404s when the review does not exist', async () => {
    findReviewByIdMock.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue(null) }),
      }),
    } as never)

    await expect(getReview(TARGET_ID)).rejects.toMatchObject({
      statusCode: StatusCodes.NOT_FOUND,
    })
  })
})

describe('deleteReview', () => {
  it('400s on an invalid reviewId', async () => {
    await expect(deleteReview(INVALID_ID)).rejects.toMatchObject({
      statusCode: StatusCodes.BAD_REQUEST,
    })
  })

  it('404s when the review does not exist', async () => {
    findReviewByIdAndDeleteMock.mockResolvedValue(null)

    await expect(deleteReview(TARGET_ID)).rejects.toMatchObject({
      statusCode: StatusCodes.NOT_FOUND,
    })
  })

  it('deletes the review and recalculates the target rating summary', async () => {
    findReviewByIdAndDeleteMock.mockResolvedValue({
      targetId: { toString: () => TARGET_ID },
      targetType: TARGET_TYPES.COMPANY,
    } as never)
    aggregateMock.mockResolvedValue([])

    await deleteReview(TARGET_ID)

    expect(findCompanyByIdAndUpdateMock).toHaveBeenCalled()
  })
})
