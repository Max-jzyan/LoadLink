import httpMocks from 'node-mocks-http'
import { StatusCodes } from 'http-status-codes'
import { ApiError } from '../../utils/ApiError'
import {
  requireRole,
  requireSelfParam,
  requireOwns,
  companyOwnsLoad,
  driverOwnsAssignedLoad,
  reviewOwnedByCaller,
} from '../authorize'
import { LoadModel } from '../../models/loads/Load'
import { ReviewModel } from '../../models/ratings/Review'
import type { AuthedUser } from '../../types/auth'

jest.mock('../../models/loads/Load')
jest.mock('../../models/ratings/Review')

const findLoadByIdMock = jest.mocked(LoadModel.findById)
const findReviewByIdMock = jest.mocked(ReviewModel.findById)

const VALID_ID = '000000000000000000000101'
const OTHER_ID = '000000000000000000000102'
const INVALID_ID = 'not-an-object-id'

function authedUser(overrides: Partial<AuthedUser> = {}): AuthedUser {
  return {
    _id: VALID_ID,
    role: 'company',
    firebaseUid: 'uid-1',
    email: 'a@example.com',
    ...overrides,
  }
}

beforeEach(() => {
  jest.resetAllMocks()
})

describe('requireRole', () => {
  it('403s when there is no authenticated user', () => {
    const req = httpMocks.createRequest()
    const next = jest.fn()

    requireRole('company')(req, httpMocks.createResponse(), next)

    expect((next.mock.calls[0][0] as ApiError).statusCode).toBe(StatusCodes.UNAUTHORIZED)
  })

  it('403s when the user role is not in the allowed list', () => {
    const req = httpMocks.createRequest({ user: authedUser({ role: 'driver' }) } as never)
    const next = jest.fn()

    requireRole('company', 'admin')(req, httpMocks.createResponse(), next)

    const err = next.mock.calls[0][0] as ApiError
    expect(err.statusCode).toBe(StatusCodes.FORBIDDEN)
    expect(err.message).toMatch(/insufficient role/)
  })

  it('calls next() when the user role is allowed', () => {
    const req = httpMocks.createRequest({ user: authedUser({ role: 'company' }) } as never)
    const next = jest.fn()

    requireRole('company', 'admin')(req, httpMocks.createResponse(), next)

    expect(next).toHaveBeenCalledWith()
  })
})

describe('requireSelfParam', () => {
  it('403s when there is no authenticated user', () => {
    const req = httpMocks.createRequest({ params: { userId: VALID_ID } })
    const next = jest.fn()

    requireSelfParam('userId')(req, httpMocks.createResponse(), next)

    expect((next.mock.calls[0][0] as ApiError).statusCode).toBe(StatusCodes.UNAUTHORIZED)
  })

  it('403s when the param does not match the caller', () => {
    const req = httpMocks.createRequest({
      params: { userId: OTHER_ID },
      user: authedUser({ _id: VALID_ID }),
    } as never)
    const next = jest.fn()

    requireSelfParam('userId')(req, httpMocks.createResponse(), next)

    const err = next.mock.calls[0][0] as ApiError
    expect(err.statusCode).toBe(StatusCodes.FORBIDDEN)
    expect(err.message).toMatch(/not your resource/)
  })

  it('calls next() when the param matches the caller', () => {
    const req = httpMocks.createRequest({
      params: { userId: VALID_ID },
      user: authedUser({ _id: VALID_ID }),
    } as never)
    const next = jest.fn()

    requireSelfParam('userId')(req, httpMocks.createResponse(), next)

    expect(next).toHaveBeenCalledWith()
  })
})

describe('requireOwns', () => {
  it('403s when there is no authenticated user (loader is never called)', async () => {
    const loader = jest.fn()
    const req = httpMocks.createRequest()
    const next = jest.fn()

    await requireOwns(loader)(req, httpMocks.createResponse(), next)

    expect((next.mock.calls[0][0] as ApiError).statusCode).toBe(StatusCodes.UNAUTHORIZED)
    expect(loader).not.toHaveBeenCalled()
  })

  it('404s when the loader finds no owner', async () => {
    const loader = jest.fn().mockResolvedValue(null)
    const req = httpMocks.createRequest({ user: authedUser() } as never)
    const next = jest.fn()

    await requireOwns(loader)(req, httpMocks.createResponse(), next)

    expect((next.mock.calls[0][0] as ApiError).statusCode).toBe(StatusCodes.NOT_FOUND)
  })

  it('403s when the owner does not match the caller', async () => {
    const loader = jest.fn().mockResolvedValue(OTHER_ID)
    const req = httpMocks.createRequest({ user: authedUser({ _id: VALID_ID }) } as never)
    const next = jest.fn()

    await requireOwns(loader)(req, httpMocks.createResponse(), next)

    const err = next.mock.calls[0][0] as ApiError
    expect(err.statusCode).toBe(StatusCodes.FORBIDDEN)
    expect(err.message).toMatch(/not your resource/)
  })

  it('calls next() when the owner matches the caller', async () => {
    const loader = jest.fn().mockResolvedValue(VALID_ID)
    const req = httpMocks.createRequest({ user: authedUser({ _id: VALID_ID }) } as never)
    const next = jest.fn()

    await requireOwns(loader)(req, httpMocks.createResponse(), next)

    expect(next).toHaveBeenCalledWith()
  })
})

describe('companyOwnsLoad', () => {
  it('returns null for a syntactically invalid loadId', async () => {
    const req = httpMocks.createRequest({ params: { loadId: INVALID_ID } })

    await expect(companyOwnsLoad(req)).resolves.toBeNull()
    expect(findLoadByIdMock).not.toHaveBeenCalled()
  })

  it('returns null when the load does not exist', async () => {
    findLoadByIdMock.mockReturnValue({ select: jest.fn().mockResolvedValue(null) } as never)
    const req = httpMocks.createRequest({ params: { loadId: VALID_ID } })

    await expect(companyOwnsLoad(req)).resolves.toBeNull()
  })

  it('returns the companyId as a string when the load exists', async () => {
    findLoadByIdMock.mockReturnValue({
      select: jest.fn().mockResolvedValue({ companyId: { toString: () => VALID_ID } }),
    } as never)
    const req = httpMocks.createRequest({ params: { loadId: VALID_ID } })

    await expect(companyOwnsLoad(req)).resolves.toBe(VALID_ID)
  })
})

describe('driverOwnsAssignedLoad', () => {
  it('returns null for a syntactically invalid loadId', async () => {
    const req = httpMocks.createRequest({ params: { loadId: INVALID_ID } })

    await expect(driverOwnsAssignedLoad(req)).resolves.toBeNull()
  })

  it('returns null when the load has no assigned driver', async () => {
    findLoadByIdMock.mockReturnValue({
      select: jest.fn().mockResolvedValue({ assignedDriverId: null }),
    } as never)
    const req = httpMocks.createRequest({ params: { loadId: VALID_ID } })

    await expect(driverOwnsAssignedLoad(req)).resolves.toBeNull()
  })

  it('returns the assignedDriverId as a string when present', async () => {
    findLoadByIdMock.mockReturnValue({
      select: jest.fn().mockResolvedValue({ assignedDriverId: { toString: () => VALID_ID } }),
    } as never)
    const req = httpMocks.createRequest({ params: { loadId: VALID_ID } })

    await expect(driverOwnsAssignedLoad(req)).resolves.toBe(VALID_ID)
  })
})

describe('reviewOwnedByCaller', () => {
  it('returns null for a syntactically invalid reviewId', async () => {
    const req = httpMocks.createRequest({ params: { reviewId: INVALID_ID } })

    await expect(reviewOwnedByCaller(req)).resolves.toBeNull()
    expect(findReviewByIdMock).not.toHaveBeenCalled()
  })

  it('returns null when the review does not exist', async () => {
    findReviewByIdMock.mockReturnValue({ select: jest.fn().mockResolvedValue(null) } as never)
    const req = httpMocks.createRequest({ params: { reviewId: VALID_ID } })

    await expect(reviewOwnedByCaller(req)).resolves.toBeNull()
  })

  it('returns the reviewerId as a string when the review exists', async () => {
    findReviewByIdMock.mockReturnValue({
      select: jest.fn().mockResolvedValue({ reviewerId: { toString: () => VALID_ID } }),
    } as never)
    const req = httpMocks.createRequest({ params: { reviewId: VALID_ID } })

    await expect(reviewOwnedByCaller(req)).resolves.toBe(VALID_ID)
  })
})
