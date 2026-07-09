import httpMocks from 'node-mocks-http'
import { StatusCodes } from 'http-status-codes'
import { ApiError } from '../../utils/ApiError'
import * as uploadService from '../../services/uploadService'
import { LoadModel } from '../../models/loads/Load'
import { CompanyModel } from '../../models/users/Company'
import { DriverModel } from '../../models/users/Driver'
import { createUploadUrl } from '../uploadController'

jest.mock('../../services/uploadService')
jest.mock('../../models/loads/Load')
// Company/Driver are discriminators; jest's automock chokes on them, so
// provide minimal manual mocks instead.
jest.mock('../../models/users/Company', () => ({ CompanyModel: { findOne: jest.fn() } }))
jest.mock('../../models/users/Driver', () => ({ DriverModel: { findOne: jest.fn() } }))

const createUploadUrlMock = jest.mocked(uploadService.createUploadUrl)
const findLoadByIdMock = jest.mocked(LoadModel.findById)
const findCompanyOneMock = jest.mocked(CompanyModel.findOne)
const findDriverOneMock = jest.mocked(DriverModel.findOne)

const FIREBASE_UID = 'uid-1'
const LOAD_ID = '000000000000000000000101'
const COMPANY_ID = '000000000000000000000001'
const DRIVER_ID = '000000000000000000000011'

beforeEach(() => {
  jest.resetAllMocks()
})

describe('createUploadUrl', () => {
  it('400s when required fields are missing', async () => {
    const req = httpMocks.createRequest({ firebaseUid: FIREBASE_UID, body: {} } as never)
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await createUploadUrl(req, res, next)

    expect((next.mock.calls[0][0] as ApiError).statusCode).toBe(StatusCodes.BAD_REQUEST)
    expect(createUploadUrlMock).not.toHaveBeenCalled()
  })

  it('uses the caller firebaseUid as ownerId for driverDocuments', async () => {
    createUploadUrlMock.mockResolvedValue({
      uploadUrl: 'https://s3/put',
      key: 'driverDocuments/uid-1/file.pdf',
      fileUrl: 'https://s3/file.pdf',
    })
    const req = httpMocks.createRequest({
      firebaseUid: FIREBASE_UID,
      body: { docType: 'driverDocuments', fileName: 'license.pdf', contentType: 'application/pdf' },
    } as never)
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await createUploadUrl(req, res, next)

    expect(createUploadUrlMock).toHaveBeenCalledWith({
      ownerId: FIREBASE_UID,
      docType: 'driverDocuments',
      fileName: 'license.pdf',
      contentType: 'application/pdf',
    })
    expect(res.statusCode).toBe(StatusCodes.OK)
  })

  it('400s for loadDocuments with a missing or invalid loadId', async () => {
    const req = httpMocks.createRequest({
      firebaseUid: FIREBASE_UID,
      body: { docType: 'loadDocuments', fileName: 'pod.pdf', contentType: 'application/pdf' },
    } as never)
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await createUploadUrl(req, res, next)

    expect((next.mock.calls[0][0] as ApiError).statusCode).toBe(StatusCodes.BAD_REQUEST)
  })

  it('404s for loadDocuments when the load does not exist', async () => {
    findLoadByIdMock.mockReturnValue({ select: jest.fn().mockResolvedValue(null) } as never)
    const req = httpMocks.createRequest({
      firebaseUid: FIREBASE_UID,
      body: {
        docType: 'loadDocuments',
        fileName: 'pod.pdf',
        contentType: 'application/pdf',
        loadId: LOAD_ID,
      },
    } as never)
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await createUploadUrl(req, res, next)

    expect((next.mock.calls[0][0] as ApiError).statusCode).toBe(StatusCodes.NOT_FOUND)
  })

  it('403s for loadDocuments when the caller is neither the posting company nor the assigned driver', async () => {
    findLoadByIdMock.mockReturnValue({
      select: jest.fn().mockResolvedValue({ companyId: COMPANY_ID, assignedDriverId: DRIVER_ID }),
    } as never)
    findCompanyOneMock.mockReturnValue({ select: jest.fn().mockResolvedValue(null) } as never)
    findDriverOneMock.mockReturnValue({ select: jest.fn().mockResolvedValue(null) } as never)

    const req = httpMocks.createRequest({
      firebaseUid: FIREBASE_UID,
      body: {
        docType: 'loadDocuments',
        fileName: 'pod.pdf',
        contentType: 'application/pdf',
        loadId: LOAD_ID,
      },
    } as never)
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await createUploadUrl(req, res, next)

    expect((next.mock.calls[0][0] as ApiError).statusCode).toBe(StatusCodes.FORBIDDEN)
  })

  it('scopes loadDocuments ownerId to the loadId when the caller is the assigned driver', async () => {
    findLoadByIdMock.mockReturnValue({
      select: jest.fn().mockResolvedValue({ companyId: COMPANY_ID, assignedDriverId: DRIVER_ID }),
    } as never)
    findCompanyOneMock.mockReturnValue({ select: jest.fn().mockResolvedValue(null) } as never)
    findDriverOneMock.mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: DRIVER_ID }),
    } as never)
    createUploadUrlMock.mockResolvedValue({
      uploadUrl: 'https://s3/put',
      key: `loadDocuments/${LOAD_ID}/file.pdf`,
      fileUrl: 'https://s3/file.pdf',
    })

    const req = httpMocks.createRequest({
      firebaseUid: FIREBASE_UID,
      body: {
        docType: 'loadDocuments',
        fileName: 'pod.pdf',
        contentType: 'application/pdf',
        loadId: LOAD_ID,
      },
    } as never)
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await createUploadUrl(req, res, next)

    expect(createUploadUrlMock).toHaveBeenCalledWith({
      ownerId: LOAD_ID,
      docType: 'loadDocuments',
      fileName: 'pod.pdf',
      contentType: 'application/pdf',
    })
    expect(res.statusCode).toBe(StatusCodes.OK)
  })

  it('forwards errors to next', async () => {
    createUploadUrlMock.mockRejectedValue(new ApiError(StatusCodes.BAD_REQUEST, 'bad type'))
    const req = httpMocks.createRequest({
      firebaseUid: FIREBASE_UID,
      body: { docType: 'driverDocuments', fileName: 'a.pdf', contentType: 'application/pdf' },
    } as never)
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await createUploadUrl(req, res, next)

    expect(next).toHaveBeenCalledWith(expect.any(ApiError))
  })
})
