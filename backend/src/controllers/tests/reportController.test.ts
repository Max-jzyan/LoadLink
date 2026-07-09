import httpMocks from 'node-mocks-http'
import { StatusCodes } from 'http-status-codes'
import { ApiError } from '../../utils/ApiError'
import * as reportService from '../../services/reportService'
import {
  createReport,
  getReportsByReporter,
  getAllReports,
  updateReportStatus,
} from '../reportController'

jest.mock('../../services/reportService')

const createReportMock = jest.mocked(reportService.createReport)
const getReportsByReporterMock = jest.mocked(reportService.getReportsByReporter)
const getAllReportsMock = jest.mocked(reportService.getAllReports)
const updateReportStatusMock = jest.mocked(reportService.updateReportStatus)

const USER_ID = '000000000000000000000011'
const REPORT_ID = '000000000000000000000301'

beforeEach(() => {
  jest.resetAllMocks()
})

describe('createReport', () => {
  it('201s with the created report', async () => {
    createReportMock.mockResolvedValue({ _id: REPORT_ID } as never)
    const body = {
      reporterId: USER_ID,
      type: 'fraud',
      targetType: 'company',
      targetName: 'Acme',
      category: 'scam',
      description: 'suspicious activity',
    }
    const req = httpMocks.createRequest({ body })
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await createReport(req, res, next)

    expect(createReportMock).toHaveBeenCalledWith(body)
    expect(res.statusCode).toBe(StatusCodes.CREATED)
    expect(res._getJSONData()).toEqual({ _id: REPORT_ID })
  })

  it('forwards errors to next', async () => {
    createReportMock.mockRejectedValue(new ApiError(StatusCodes.BAD_REQUEST, 'invalid'))
    const req = httpMocks.createRequest({ body: {} })
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await createReport(req, res, next)

    expect(next).toHaveBeenCalledWith(expect.any(ApiError))
  })
})

describe('getReportsByReporter', () => {
  it("200s with the reporter's reports", async () => {
    getReportsByReporterMock.mockResolvedValue([{ _id: REPORT_ID }] as never)
    const req = httpMocks.createRequest({ params: { userId: USER_ID } })
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await getReportsByReporter(req, res, next)

    expect(getReportsByReporterMock).toHaveBeenCalledWith(USER_ID)
    expect(res.statusCode).toBe(StatusCodes.OK)
    expect(res._getJSONData()).toEqual([{ _id: REPORT_ID }])
  })

  it('forwards errors to next', async () => {
    getReportsByReporterMock.mockRejectedValue(new ApiError(StatusCodes.NOT_FOUND, 'no user'))
    const req = httpMocks.createRequest({ params: { userId: USER_ID } })
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await getReportsByReporter(req, res, next)

    expect(next).toHaveBeenCalledWith(expect.any(ApiError))
  })
})

describe('getAllReports', () => {
  it('passes no filter when status is omitted', async () => {
    getAllReportsMock.mockResolvedValue([] as never)
    const req = httpMocks.createRequest({ query: {} })
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await getAllReports(req, res, next)

    expect(getAllReportsMock).toHaveBeenCalledWith(undefined)
    expect(res.statusCode).toBe(StatusCodes.OK)
  })

  it('passes a status filter through when present', async () => {
    getAllReportsMock.mockResolvedValue([{ _id: REPORT_ID }] as never)
    const req = httpMocks.createRequest({ query: { status: 'under_review' } })
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await getAllReports(req, res, next)

    expect(getAllReportsMock).toHaveBeenCalledWith({ status: 'under_review' })
  })

  it('forwards errors to next', async () => {
    getAllReportsMock.mockRejectedValue(new ApiError(StatusCodes.BAD_REQUEST, 'bad status'))
    const req = httpMocks.createRequest({ query: {} })
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await getAllReports(req, res, next)

    expect(next).toHaveBeenCalledWith(expect.any(ApiError))
  })
})

describe('updateReportStatus', () => {
  it('200s with the updated report', async () => {
    updateReportStatusMock.mockResolvedValue({ _id: REPORT_ID, status: 'resolved' } as never)
    const req = httpMocks.createRequest({
      params: { reportId: REPORT_ID },
      body: { status: 'resolved', adminId: USER_ID },
    })
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await updateReportStatus(req, res, next)

    expect(updateReportStatusMock).toHaveBeenCalledWith(REPORT_ID, 'resolved', USER_ID)
    expect(res.statusCode).toBe(StatusCodes.OK)
  })

  it('forwards errors to next', async () => {
    updateReportStatusMock.mockRejectedValue(new ApiError(StatusCodes.NOT_FOUND, 'no report'))
    const req = httpMocks.createRequest({
      params: { reportId: REPORT_ID },
      body: { status: 'resolved' },
    })
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await updateReportStatus(req, res, next)

    expect(next).toHaveBeenCalledWith(expect.any(ApiError))
  })
})
