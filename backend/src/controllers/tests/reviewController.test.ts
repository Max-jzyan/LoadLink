import httpMocks from 'node-mocks-http'
import { StatusCodes } from 'http-status-codes'
import { ApiError } from '../../utils/ApiError'
import * as reviewService from '../../services/reviewService'
import { createReview, getReviewsForTarget, getReview, deleteReview } from '../reviewController'
import type { AuthedUser } from '../../types/auth'

jest.mock('../../services/reviewService')

const createCompanyReviewMock = jest.mocked(reviewService.createCompanyReview)
const getReviewsForTargetMock = jest.mocked(reviewService.getReviewsForTarget)
const getReviewMock = jest.mocked(reviewService.getReview)
const deleteReviewMock = jest.mocked(reviewService.deleteReview)

const COMPANY_ID = '000000000000000000000001'
const TARGET_ID = '000000000000000000000011'
const REVIEW_ID = '000000000000000000000401'
const LOAD_ID = '000000000000000000000101'

function companyUser(): AuthedUser {
  return { _id: COMPANY_ID, role: 'company', firebaseUid: 'uid-1', email: 'c@x.com' }
}

beforeEach(() => {
  jest.resetAllMocks()
})

describe('createReview', () => {
  it('201s with the created review, injecting reviewerId from the authenticated user', async () => {
    createCompanyReviewMock.mockResolvedValue({ _id: REVIEW_ID } as never)
    const req = httpMocks.createRequest({
      user: companyUser(),
      body: { targetId: TARGET_ID, loadId: LOAD_ID, ratingCategories: { punctuality: 5 } },
    } as never)
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await createReview(req, res, next)

    expect(createCompanyReviewMock).toHaveBeenCalledWith({
      targetId: TARGET_ID,
      loadId: LOAD_ID,
      ratingCategories: { punctuality: 5 },
      reviewerId: COMPANY_ID,
    })
    expect(res.statusCode).toBe(StatusCodes.CREATED)
    expect(res._getJSONData()).toEqual({ _id: REVIEW_ID })
  })

  it('forwards errors to next', async () => {
    createCompanyReviewMock.mockRejectedValue(new ApiError(StatusCodes.FORBIDDEN, 'not a company'))
    const req = httpMocks.createRequest({ user: companyUser(), body: {} } as never)
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await createReview(req, res, next)

    expect(next).toHaveBeenCalledWith(expect.any(ApiError))
  })
})

describe('getReviewsForTarget', () => {
  it('parses page and limit from the query string', async () => {
    getReviewsForTargetMock.mockResolvedValue({ reviews: [], total: 0 } as never)
    const req = httpMocks.createRequest({
      params: { targetId: TARGET_ID },
      query: { page: '2', limit: '10' },
    })
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await getReviewsForTarget(req, res, next)

    expect(getReviewsForTargetMock).toHaveBeenCalledWith(TARGET_ID, { page: 2, limit: 10 })
    expect(res.statusCode).toBe(StatusCodes.OK)
  })

  it('passes undefined page/limit when omitted', async () => {
    getReviewsForTargetMock.mockResolvedValue({ reviews: [], total: 0 } as never)
    const req = httpMocks.createRequest({ params: { targetId: TARGET_ID }, query: {} })
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await getReviewsForTarget(req, res, next)

    expect(getReviewsForTargetMock).toHaveBeenCalledWith(TARGET_ID, {
      page: undefined,
      limit: undefined,
    })
  })

  it('forwards errors to next', async () => {
    getReviewsForTargetMock.mockRejectedValue(new ApiError(StatusCodes.NOT_FOUND, 'no target'))
    const req = httpMocks.createRequest({ params: { targetId: TARGET_ID }, query: {} })
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await getReviewsForTarget(req, res, next)

    expect(next).toHaveBeenCalledWith(expect.any(ApiError))
  })
})

describe('getReview', () => {
  it('200s with the review', async () => {
    getReviewMock.mockResolvedValue({ _id: REVIEW_ID } as never)
    const req = httpMocks.createRequest({ params: { reviewId: REVIEW_ID } })
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await getReview(req, res, next)

    expect(getReviewMock).toHaveBeenCalledWith(REVIEW_ID)
    expect(res.statusCode).toBe(StatusCodes.OK)
  })

  it('forwards errors to next', async () => {
    getReviewMock.mockRejectedValue(new ApiError(StatusCodes.NOT_FOUND, 'not found'))
    const req = httpMocks.createRequest({ params: { reviewId: REVIEW_ID } })
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await getReview(req, res, next)

    expect(next).toHaveBeenCalledWith(expect.any(ApiError))
  })
})

describe('deleteReview', () => {
  it('204s with no body', async () => {
    deleteReviewMock.mockResolvedValue(undefined as never)
    const req = httpMocks.createRequest({ params: { reviewId: REVIEW_ID } })
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await deleteReview(req, res, next)

    expect(deleteReviewMock).toHaveBeenCalledWith(REVIEW_ID)
    expect(res.statusCode).toBe(StatusCodes.NO_CONTENT)
  })

  it('forwards errors to next', async () => {
    deleteReviewMock.mockRejectedValue(new ApiError(StatusCodes.NOT_FOUND, 'not found'))
    const req = httpMocks.createRequest({ params: { reviewId: REVIEW_ID } })
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await deleteReview(req, res, next)

    expect(next).toHaveBeenCalledWith(expect.any(ApiError))
  })
})
