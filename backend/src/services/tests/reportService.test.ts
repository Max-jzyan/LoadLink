import { StatusCodes } from 'http-status-codes'
import {
  ReportModel,
  REPORT_TYPES,
  REPORT_TARGET_TYPES,
  REPORT_STATUSES,
} from '../../models/reports/Report'
import { UserModel } from '../../models/users/User'
import {
  createReport,
  getReportsByReporter,
  getAllReports,
  updateReportStatus,
} from '../reportService'

jest.mock('../../models/reports/Report')
jest.mock('../../models/users/User')

const createReportMock = jest.mocked(ReportModel.create)
const findReportMock = jest.mocked(ReportModel.find)
const findReportByIdAndUpdateMock = jest.mocked(ReportModel.findByIdAndUpdate)
const findOneUserMock = jest.mocked(UserModel.findOne)

const REPORTER_ID = '000000000000000000000011'
const REPORT_ID = '000000000000000000000501'
const ADMIN_ID = '000000000000000000000099'
const INVALID_ID = 'not-an-object-id'

function validReportData(overrides: Record<string, unknown> = {}) {
  return {
    reporterId: REPORTER_ID,
    type: REPORT_TYPES.FRAUD,
    targetType: REPORT_TARGET_TYPES.COMPANY,
    targetName: 'Acme Logistics',
    category: 'billing',
    description: 'Overcharged for a load',
    ...overrides,
  }
}

beforeEach(() => {
  jest.resetAllMocks()
})

describe('createReport', () => {
  it('400s on an invalid reporterId', async () => {
    await expect(createReport(validReportData({ reporterId: INVALID_ID }))).rejects.toMatchObject({
      statusCode: StatusCodes.BAD_REQUEST,
    })
  })

  it('400s on an invalid type', async () => {
    await expect(createReport(validReportData({ type: 'other' }))).rejects.toMatchObject({
      statusCode: StatusCodes.BAD_REQUEST,
    })
  })

  it('400s on an invalid targetType', async () => {
    await expect(createReport(validReportData({ targetType: 'admin' }))).rejects.toMatchObject({
      statusCode: StatusCodes.BAD_REQUEST,
    })
  })

  it('400s when targetName/category/description are blank', async () => {
    await expect(createReport(validReportData({ targetName: '   ' }))).rejects.toMatchObject({
      statusCode: StatusCodes.BAD_REQUEST,
    })
    await expect(createReport(validReportData({ category: '' }))).rejects.toMatchObject({
      statusCode: StatusCodes.BAD_REQUEST,
    })
  })

  it('resolves targetId when a matching registered user exists', async () => {
    findOneUserMock.mockResolvedValue({ _id: 'resolved-user-id' } as never)
    createReportMock.mockResolvedValue({ _id: 'report-1' } as never)

    await createReport(validReportData())

    expect(createReportMock).toHaveBeenCalledWith(
      expect.objectContaining({ targetId: 'resolved-user-id', targetName: 'Acme Logistics' })
    )
  })

  it('leaves targetId null when no registered user matches', async () => {
    findOneUserMock.mockResolvedValue(null)
    createReportMock.mockResolvedValue({ _id: 'report-1' } as never)

    await createReport(validReportData())

    expect(createReportMock).toHaveBeenCalledWith(expect.objectContaining({ targetId: null }))
  })
})

describe('getReportsByReporter', () => {
  it('400s on an invalid reporterId', async () => {
    await expect(getReportsByReporter(INVALID_ID)).rejects.toMatchObject({
      statusCode: StatusCodes.BAD_REQUEST,
    })
  })

  it('sorts newest first for this reporter', async () => {
    const sortMock = jest.fn().mockResolvedValue([])
    findReportMock.mockReturnValue({ sort: sortMock } as never)

    await getReportsByReporter(REPORTER_ID)

    expect(sortMock).toHaveBeenCalledWith({ createdAt: -1 })
  })
})

describe('getAllReports', () => {
  it('applies no filter by default', async () => {
    const populateMock = jest.fn().mockReturnThis()
    const sortMock = jest.fn().mockReturnValue({ populate: populateMock })
    findReportMock.mockReturnValue({ sort: sortMock } as never)

    await getAllReports()

    expect(findReportMock).toHaveBeenCalledWith({})
  })

  it('filters by status when provided', async () => {
    const populateMock = jest.fn().mockReturnThis()
    const sortMock = jest.fn().mockReturnValue({ populate: populateMock })
    findReportMock.mockReturnValue({ sort: sortMock } as never)

    await getAllReports({ status: REPORT_STATUSES.Resolved })

    expect(findReportMock).toHaveBeenCalledWith({ status: REPORT_STATUSES.Resolved })
  })
})

describe('updateReportStatus', () => {
  it('400s on an invalid reportId', async () => {
    await expect(updateReportStatus(INVALID_ID, REPORT_STATUSES.Resolved)).rejects.toMatchObject({
      statusCode: StatusCodes.BAD_REQUEST,
    })
  })

  it('400s on an invalid status', async () => {
    await expect(updateReportStatus(REPORT_ID, 'bogus' as never)).rejects.toMatchObject({
      statusCode: StatusCodes.BAD_REQUEST,
    })
  })

  it('404s when the report does not exist', async () => {
    findReportByIdAndUpdateMock.mockResolvedValue(null)

    await expect(updateReportStatus(REPORT_ID, REPORT_STATUSES.Resolved)).rejects.toMatchObject({
      statusCode: StatusCodes.NOT_FOUND,
    })
  })

  it('sets resolvedByAdminId when a valid adminId is given', async () => {
    findReportByIdAndUpdateMock.mockResolvedValue({ _id: REPORT_ID } as never)

    await updateReportStatus(REPORT_ID, REPORT_STATUSES.Resolved, ADMIN_ID)

    expect(findReportByIdAndUpdateMock).toHaveBeenCalledWith(
      REPORT_ID,
      { status: REPORT_STATUSES.Resolved, resolvedByAdminId: expect.anything() },
      { new: true }
    )
  })

  it('leaves resolvedByAdminId null when adminId is omitted or invalid', async () => {
    findReportByIdAndUpdateMock.mockResolvedValue({ _id: REPORT_ID } as never)

    await updateReportStatus(REPORT_ID, REPORT_STATUSES.Dismissed)

    expect(findReportByIdAndUpdateMock).toHaveBeenCalledWith(
      REPORT_ID,
      { status: REPORT_STATUSES.Dismissed, resolvedByAdminId: null },
      { new: true }
    )
  })
})
