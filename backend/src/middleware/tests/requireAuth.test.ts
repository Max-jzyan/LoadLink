import httpMocks from 'node-mocks-http'
import { mock } from 'jest-mock-extended'
import type { Auth } from 'firebase-admin/auth'
import { StatusCodes } from 'http-status-codes'
import { ApiError } from '../../utils/ApiError'
import { requireFirebaseToken, requireAuth, requireAuthSSE } from '../requireAuth'
import { getFirebaseAuth } from '../../lib/firebaseAdmin'
import { UserModel } from '../../models/users/User'

jest.mock('../../lib/firebaseAdmin', () => ({ getFirebaseAuth: jest.fn() }))
jest.mock('../../models/users/User')

const getFirebaseAuthMock = jest.mocked(getFirebaseAuth)
const findOneMock = jest.mocked(UserModel.findOne)
const updateOneMock = jest.mocked(UserModel.updateOne)

const FIREBASE_UID = 'firebase-uid-1'
const USER_ID = '000000000000000000000011'

function fakeUserDoc(role: string) {
  return {
    _id: { toString: () => USER_ID },
    firebaseUid: FIREBASE_UID,
    email: 'driver1@example.com',
    get: (key: string) => (key === 'role' ? role : undefined),
  }
}

function mockAuth(): Auth {
  const auth = mock<Auth>()
  return auth
}

beforeEach(() => {
  jest.resetAllMocks()
  updateOneMock.mockReturnValue({ catch: jest.fn() } as never)
})

describe('requireFirebaseToken', () => {
  it('500s when Firebase admin is not configured', async () => {
    getFirebaseAuthMock.mockReturnValue(null)
    const req = httpMocks.createRequest()
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await requireFirebaseToken(req, res, next)

    expect(next).toHaveBeenCalledWith(expect.any(ApiError))
    expect((next.mock.calls[0][0] as ApiError).statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR)
  })

  it('401s when no Authorization header is present', async () => {
    getFirebaseAuthMock.mockReturnValue(mockAuth())
    const req = httpMocks.createRequest()
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await requireFirebaseToken(req, res, next)

    expect((next.mock.calls[0][0] as ApiError).statusCode).toBe(StatusCodes.UNAUTHORIZED)
  })

  it('401s when the token fails verification', async () => {
    const auth = mockAuth()
    ;(auth.verifyIdToken as jest.Mock).mockRejectedValue(new Error('bad token'))
    getFirebaseAuthMock.mockReturnValue(auth)
    const req = httpMocks.createRequest({ headers: { authorization: 'Bearer bad.token' } })
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await requireFirebaseToken(req, res, next)

    expect((next.mock.calls[0][0] as ApiError).statusCode).toBe(StatusCodes.UNAUTHORIZED)
  })

  it('sets req.firebaseUid and calls next() on a valid token', async () => {
    const auth = mockAuth()
    ;(auth.verifyIdToken as jest.Mock).mockResolvedValue({ uid: FIREBASE_UID })
    getFirebaseAuthMock.mockReturnValue(auth)
    const req = httpMocks.createRequest({ headers: { authorization: 'Bearer good.token' } })
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await requireFirebaseToken(req, res, next)

    expect(req.firebaseUid).toBe(FIREBASE_UID)
    expect(next).toHaveBeenCalledWith()
  })
})

describe('requireAuth', () => {
  it('401s when no Authorization header is present', async () => {
    const req = httpMocks.createRequest()
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await requireAuth(req, res, next)

    expect((next.mock.calls[0][0] as ApiError).statusCode).toBe(StatusCodes.UNAUTHORIZED)
    expect(getFirebaseAuthMock).not.toHaveBeenCalled()
  })

  it('500s when Firebase admin is not configured', async () => {
    getFirebaseAuthMock.mockReturnValue(null)
    const req = httpMocks.createRequest({ headers: { authorization: 'Bearer good.token' } })
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await requireAuth(req, res, next)

    expect((next.mock.calls[0][0] as ApiError).statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR)
  })

  it('401s when the token fails verification', async () => {
    const auth = mockAuth()
    ;(auth.verifyIdToken as jest.Mock).mockRejectedValue(new Error('bad token'))
    getFirebaseAuthMock.mockReturnValue(auth)
    const req = httpMocks.createRequest({ headers: { authorization: 'Bearer bad.token' } })
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await requireAuth(req, res, next)

    expect((next.mock.calls[0][0] as ApiError).statusCode).toBe(StatusCodes.UNAUTHORIZED)
  })

  it('403s when the token is valid but no matching user exists in Mongo', async () => {
    const auth = mockAuth()
    ;(auth.verifyIdToken as jest.Mock).mockResolvedValue({ uid: FIREBASE_UID })
    getFirebaseAuthMock.mockReturnValue(auth)
    findOneMock.mockReturnValue({ select: jest.fn().mockResolvedValue(null) } as never)
    const req = httpMocks.createRequest({ headers: { authorization: 'Bearer good.token' } })
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await requireAuth(req, res, next)

    expect((next.mock.calls[0][0] as ApiError).statusCode).toBe(StatusCodes.FORBIDDEN)
  })

  it('populates req.user and calls next() when the token and user are valid', async () => {
    const auth = mockAuth()
    ;(auth.verifyIdToken as jest.Mock).mockResolvedValue({ uid: FIREBASE_UID })
    getFirebaseAuthMock.mockReturnValue(auth)
    findOneMock.mockReturnValue({
      select: jest.fn().mockResolvedValue(fakeUserDoc('driver')),
    } as never)
    const req = httpMocks.createRequest({ headers: { authorization: 'Bearer good.token' } })
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await requireAuth(req, res, next)

    expect(req.user).toEqual({
      _id: USER_ID,
      role: 'driver',
      firebaseUid: FIREBASE_UID,
      email: 'driver1@example.com',
    })
    expect(next).toHaveBeenCalledWith(undefined)
  })
})

describe('requireAuthSSE', () => {
  it('401s when no access_token query param is present', async () => {
    const req = httpMocks.createRequest()
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await requireAuthSSE(req, res, next)

    expect((next.mock.calls[0][0] as ApiError).statusCode).toBe(StatusCodes.UNAUTHORIZED)
    expect(getFirebaseAuthMock).not.toHaveBeenCalled()
  })

  it('401s when the token in the query string fails verification', async () => {
    const auth = mockAuth()
    ;(auth.verifyIdToken as jest.Mock).mockRejectedValue(new Error('bad token'))
    getFirebaseAuthMock.mockReturnValue(auth)
    const req = httpMocks.createRequest({ query: { access_token: 'bad.token' } })
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await requireAuthSSE(req, res, next)

    expect((next.mock.calls[0][0] as ApiError).statusCode).toBe(StatusCodes.UNAUTHORIZED)
  })

  it('populates req.user and calls next() when the query token is valid', async () => {
    const auth = mockAuth()
    ;(auth.verifyIdToken as jest.Mock).mockResolvedValue({ uid: FIREBASE_UID })
    getFirebaseAuthMock.mockReturnValue(auth)
    findOneMock.mockReturnValue({
      select: jest.fn().mockResolvedValue(fakeUserDoc('company')),
    } as never)
    const req = httpMocks.createRequest({ query: { access_token: 'good.token' } })
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await requireAuthSSE(req, res, next)

    expect(req.user?.role).toBe('company')
    expect(next).toHaveBeenCalledWith(undefined)
  })
})
