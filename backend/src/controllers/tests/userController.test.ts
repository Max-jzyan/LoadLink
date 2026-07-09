import httpMocks from 'node-mocks-http'
import { StatusCodes } from 'http-status-codes'
import { ApiError } from '../../utils/ApiError'
import { UserModel } from '../../models/users/User'
import { DriverModel } from '../../models/users/Driver'
import { CompanyModel } from '../../models/users/Company'
import * as uploadService from '../../services/uploadService'
import {
  registerUser,
  getMe,
  getFeedPreferences,
  getMyProfile,
  updateMyProfile,
  updateFeedPreferences,
} from '../userController'

jest.mock('../../models/users/User')
// Driver/Company are discriminators; jest's automock chokes on them, so
// provide minimal manual mocks instead.
jest.mock('../../models/users/Driver', () => ({
  DriverModel: { findOne: jest.fn(), create: jest.fn() },
}))
jest.mock('../../models/users/Company', () => ({
  CompanyModel: { findOne: jest.fn(), create: jest.fn() },
}))
jest.mock('../../services/uploadService')

const findUserOneMock = jest.mocked(UserModel.findOne)
const findUserByIdMock = jest.mocked(UserModel.findById)
const findUserByIdAndUpdateMock = jest.mocked(UserModel.findByIdAndUpdate)
const findUserOneAndUpdateMock = jest.mocked(UserModel.findOneAndUpdate)
const findDriverOneMock = jest.mocked(DriverModel.findOne)
const createDriverMock = jest.mocked(DriverModel.create)
const findCompanyOneMock = jest.mocked(CompanyModel.findOne)
const createCompanyMock = jest.mocked(CompanyModel.create)
const toViewableUrlMock = jest.mocked(uploadService.toViewableUrl)

const FIREBASE_UID = 'uid-1'
const USER_ID = '000000000000000000000011'

beforeEach(() => {
  jest.resetAllMocks()
})

describe('registerUser', () => {
  it('400s when required fields are missing', async () => {
    const req = httpMocks.createRequest({ firebaseUid: FIREBASE_UID, body: {} } as never)
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await registerUser(req, res, next)

    expect((next.mock.calls[0][0] as ApiError).statusCode).toBe(StatusCodes.BAD_REQUEST)
  })

  it('400s on an invalid role', async () => {
    const req = httpMocks.createRequest({
      firebaseUid: FIREBASE_UID,
      body: { name: 'A', email: 'a@x.com', role: 'admin' },
    } as never)
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await registerUser(req, res, next)

    expect((next.mock.calls[0][0] as ApiError).statusCode).toBe(StatusCodes.BAD_REQUEST)
  })

  it('200s with the existing user when already registered (idempotent)', async () => {
    findUserOneMock.mockResolvedValue({ _id: USER_ID } as never)
    const req = httpMocks.createRequest({
      firebaseUid: FIREBASE_UID,
      body: { name: 'A', email: 'a@x.com', role: 'driver' },
    } as never)
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await registerUser(req, res, next)

    expect(res.statusCode).toBe(StatusCodes.OK)
    expect(createDriverMock).not.toHaveBeenCalled()
  })

  it('201s creating a Driver document for role=driver', async () => {
    findUserOneMock.mockResolvedValue(null)
    createDriverMock.mockResolvedValue({ _id: USER_ID } as never)
    const req = httpMocks.createRequest({
      firebaseUid: FIREBASE_UID,
      body: { name: 'A', email: 'a@x.com', role: 'driver', certificationDocuments: [] },
    } as never)
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await registerUser(req, res, next)

    expect(createDriverMock).toHaveBeenCalledWith({
      firebaseUid: FIREBASE_UID,
      name: 'A',
      email: 'a@x.com',
      certificationDocuments: [],
    })
    expect(res.statusCode).toBe(StatusCodes.CREATED)
  })

  it('201s creating a Company document for role=company', async () => {
    findUserOneMock.mockResolvedValue(null)
    createCompanyMock.mockResolvedValue({ _id: USER_ID } as never)
    const req = httpMocks.createRequest({
      firebaseUid: FIREBASE_UID,
      body: { name: 'Acme', email: 'a@x.com', role: 'company' },
    } as never)
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await registerUser(req, res, next)

    expect(createCompanyMock).toHaveBeenCalledWith({
      firebaseUid: FIREBASE_UID,
      name: 'Acme',
      email: 'a@x.com',
      companyName: 'Acme',
      contactName: 'Acme',
      businessDocuments: [],
    })
    expect(res.statusCode).toBe(StatusCodes.CREATED)
  })

  it('forwards errors to next', async () => {
    findUserOneMock.mockRejectedValue(new Error('db down'))
    const req = httpMocks.createRequest({
      firebaseUid: FIREBASE_UID,
      body: { name: 'A', email: 'a@x.com', role: 'driver' },
    } as never)
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await registerUser(req, res, next)

    expect(next).toHaveBeenCalledWith(expect.any(Error))
  })
})

describe('getMe', () => {
  it('200s with the user document', async () => {
    findUserOneMock.mockResolvedValue({ _id: USER_ID } as never)
    const req = httpMocks.createRequest({ firebaseUid: FIREBASE_UID } as never)
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await getMe(req, res, next)

    expect(findUserOneMock).toHaveBeenCalledWith({ firebaseUid: FIREBASE_UID })
    expect(res.statusCode).toBe(StatusCodes.OK)
  })

  it('404s when there is no matching user', async () => {
    findUserOneMock.mockResolvedValue(null)
    const req = httpMocks.createRequest({ firebaseUid: FIREBASE_UID } as never)
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await getMe(req, res, next)

    expect(res.statusCode).toBe(StatusCodes.NOT_FOUND)
  })

  it('forwards errors to next', async () => {
    findUserOneMock.mockRejectedValue(new Error('db down'))
    const req = httpMocks.createRequest({ firebaseUid: FIREBASE_UID } as never)
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await getMe(req, res, next)

    expect(next).toHaveBeenCalledWith(expect.any(Error))
  })
})

describe('getFeedPreferences', () => {
  it('200s with feedPreferences, defaulting to {} when unset', async () => {
    findUserByIdMock.mockReturnValue({
      select: jest.fn().mockResolvedValue({ feedPreferences: undefined }),
    } as never)
    const req = httpMocks.createRequest({ params: { userId: USER_ID } })
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await getFeedPreferences(req, res, next)

    expect(res.statusCode).toBe(StatusCodes.OK)
    expect(res._getJSONData()).toEqual({})
  })

  it('404s when the user does not exist', async () => {
    findUserByIdMock.mockReturnValue({ select: jest.fn().mockResolvedValue(null) } as never)
    const req = httpMocks.createRequest({ params: { userId: USER_ID } })
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await getFeedPreferences(req, res, next)

    expect((next.mock.calls[0][0] as ApiError).statusCode).toBe(StatusCodes.NOT_FOUND)
  })
})

describe('getMyProfile', () => {
  it('200s with the driver profile, swapping in a viewable profile picture URL', async () => {
    findDriverOneMock.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: USER_ID, profilePictureUrl: 'raw-url' }),
      }),
    } as never)
    toViewableUrlMock.mockResolvedValue('https://signed/url')

    const req = httpMocks.createRequest({ firebaseUid: FIREBASE_UID } as never)
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await getMyProfile(req, res, next)

    expect(toViewableUrlMock).toHaveBeenCalledWith('raw-url')
    expect(res.statusCode).toBe(StatusCodes.OK)
    expect(res._getJSONData().profilePictureUrl).toBe('https://signed/url')
  })

  it('falls back to the company profile when no driver matches', async () => {
    findDriverOneMock.mockReturnValue({
      populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }),
    } as never)
    findCompanyOneMock.mockReturnValue({
      lean: jest.fn().mockResolvedValue({ _id: USER_ID, profilePictureUrl: null }),
    } as never)
    toViewableUrlMock.mockResolvedValue(undefined)

    const req = httpMocks.createRequest({ firebaseUid: FIREBASE_UID } as never)
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await getMyProfile(req, res, next)

    expect(res.statusCode).toBe(StatusCodes.OK)
    expect(res._getJSONData().profilePictureUrl).toBe('')
  })

  it('404s when neither a driver nor a company match', async () => {
    findDriverOneMock.mockReturnValue({
      populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }),
    } as never)
    findCompanyOneMock.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) } as never)

    const req = httpMocks.createRequest({ firebaseUid: FIREBASE_UID } as never)
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await getMyProfile(req, res, next)

    expect((next.mock.calls[0][0] as ApiError).statusCode).toBe(StatusCodes.NOT_FOUND)
  })
})

describe('updateMyProfile', () => {
  it('400s when no allowed fields are present', async () => {
    const req = httpMocks.createRequest({
      firebaseUid: FIREBASE_UID,
      body: { bogus: 1 },
    } as never)
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await updateMyProfile(req, res, next)

    expect((next.mock.calls[0][0] as ApiError).statusCode).toBe(StatusCodes.BAD_REQUEST)
  })

  it('200s with the updated user, filtering to allowed fields', async () => {
    findUserOneAndUpdateMock.mockReturnValue({
      lean: jest.fn().mockResolvedValue({ _id: USER_ID, name: 'New Name' }),
    } as never)
    const req = httpMocks.createRequest({
      firebaseUid: FIREBASE_UID,
      body: { name: 'New Name', bogus: 1 },
    } as never)
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await updateMyProfile(req, res, next)

    expect(findUserOneAndUpdateMock).toHaveBeenCalledWith(
      { firebaseUid: FIREBASE_UID },
      { $set: { name: 'New Name' } },
      { new: true, runValidators: true }
    )
    expect(res.statusCode).toBe(StatusCodes.OK)
  })

  it('404s when the user does not exist', async () => {
    findUserOneAndUpdateMock.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) } as never)
    const req = httpMocks.createRequest({
      firebaseUid: FIREBASE_UID,
      body: { name: 'New Name' },
    } as never)
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await updateMyProfile(req, res, next)

    expect((next.mock.calls[0][0] as ApiError).statusCode).toBe(StatusCodes.NOT_FOUND)
  })
})

describe('updateFeedPreferences', () => {
  it('400s when no valid preference keys are provided', async () => {
    const req = httpMocks.createRequest({ params: { userId: USER_ID }, body: { bogus: true } })
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await updateFeedPreferences(req, res, next)

    expect((next.mock.calls[0][0] as ApiError).statusCode).toBe(StatusCodes.BAD_REQUEST)
  })

  it('namespaces boolean keys under feedPreferences and 200s', async () => {
    findUserByIdAndUpdateMock.mockReturnValue({
      select: jest.fn().mockResolvedValue({ feedPreferences: { hideBlocked: true } }),
    } as never)
    const req = httpMocks.createRequest({
      params: { userId: USER_ID },
      body: { hideBlocked: true, notifyReview: 'not-a-bool' },
    })
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await updateFeedPreferences(req, res, next)

    expect(findUserByIdAndUpdateMock).toHaveBeenCalledWith(
      USER_ID,
      { $set: { 'feedPreferences.hideBlocked': true } },
      { new: true }
    )
    expect(res.statusCode).toBe(StatusCodes.OK)
    expect(res._getJSONData()).toEqual({ hideBlocked: true })
  })

  it('404s when the user does not exist', async () => {
    findUserByIdAndUpdateMock.mockReturnValue({
      select: jest.fn().mockResolvedValue(null),
    } as never)
    const req = httpMocks.createRequest({
      params: { userId: USER_ID },
      body: { hideBlocked: true },
    })
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await updateFeedPreferences(req, res, next)

    expect((next.mock.calls[0][0] as ApiError).statusCode).toBe(StatusCodes.NOT_FOUND)
  })
})
