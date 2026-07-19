import { StatusCodes } from 'http-status-codes'
import {
  ReportModel,
  REPORT_TYPES,
  REPORT_TARGET_TYPES,
  REPORT_STATUSES,
} from '../../models/reports/Report'
import { USER_ROLES } from '../../models/enums'
import { UserModel } from '../../models/users/User'
import { BidModel } from '../../models/loads/Bid'
import { LoadModel } from '../../models/loads/Load'
import {
  createReport,
  getReportableCollaborators,
  getReportableLoads,
  getReportsByReporter,
  getAllReports,
  updateReportStatus,
} from '../reportService'

jest.mock('../../models/reports/Report')
jest.mock('../../models/users/User')
jest.mock('../../models/loads/Bid')
jest.mock('../../models/loads/Load')

const createReportMock = jest.mocked(ReportModel.create)
const findReportMock = jest.mocked(ReportModel.find)
const findReportByIdAndUpdateMock = jest.mocked(ReportModel.findByIdAndUpdate)
const findByIdUserMock = jest.mocked(UserModel.findById)
const bidAggregateMock = jest.mocked(BidModel.aggregate)
const loadAggregateMock = jest.mocked(LoadModel.aggregate)
const distinctBidMock = jest.mocked(BidModel.distinct)
const findLoadMock = jest.mocked(LoadModel.find)

const REPORTER_ID = '000000000000000000000011'
const TARGET_ID = '000000000000000000000022'
const REPORT_ID = '000000000000000000000501'
const ADMIN_ID = '000000000000000000000099'
const INVALID_ID = 'not-an-object-id'

const ACME = { _id: TARGET_ID, name: 'Acme Logistics', email: 'acme@example.com' }

function validReportData(overrides: Record<string, unknown> = {}) {
  return {
    reporterId: REPORTER_ID,
    type: REPORT_TYPES.FRAUD,
    targetType: REPORT_TARGET_TYPES.COMPANY,
    targetEmail: 'acme@example.com',
    category: 'billing',
    description: 'Overcharged for a load',
    ...overrides,
  }
}

function mockReporter(role: string) {
  const selectMock = jest.fn().mockResolvedValue({ _id: REPORTER_ID, role })
  findByIdUserMock.mockReturnValue({ select: selectMock } as never)
}

/**
 * Aggregate rows as getReportableCollaborators reads them (post-$project).
 * The two rounds of aggregation happen sequentially regardless of role, but
 * which model backs each round differs: driver role queries Bid then Load;
 * company role queries Load twice. Feeding both mocks from one shared,
 * call-order queue keeps this helper correct for either role.
 */
function mockCollaboratorAggregates(
  acceptedBidRows: unknown[],
  assignedLoadRows: unknown[] = []
) {
  const queue = [acceptedBidRows, assignedLoadRows]
  const next = () => Promise.resolve(queue.length > 1 ? queue.shift() : queue[0])
  bidAggregateMock.mockImplementation(next as never)
  loadAggregateMock.mockImplementation(next as never)
}

/** Loads as getReportableLoads / findReportableLoadDocs read them (post-projection, pre-sort) */
function mockReportableLoads(rows: Array<{ _id: string; status?: string; companyId?: string }>) {
  distinctBidMock.mockResolvedValue(rows.map((r) => r._id) as never)
  const sortMock = jest.fn().mockResolvedValue(
    rows.map((r) => ({
      _id: { toString: () => r._id },
      originAddress: 'Origin Rd',
      destinationAddress: 'Destination Ave',
      commodity: 'Steel Coils',
      status: r.status ?? 'booked',
      companyId: r.companyId ?? null,
    }))
  )
  findLoadMock.mockReturnValue({ sort: sortMock } as never)
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

  it('400s when category/description are blank', async () => {
    await expect(createReport(validReportData({ category: '' }))).rejects.toMatchObject({
      statusCode: StatusCodes.BAD_REQUEST,
    })
    await expect(createReport(validReportData({ description: '   ' }))).rejects.toMatchObject({
      statusCode: StatusCodes.BAD_REQUEST,
    })
  })

  it('404s when the reporter does not exist', async () => {
    const selectMock = jest.fn().mockResolvedValue(null)
    findByIdUserMock.mockReturnValue({ select: selectMock } as never)

    await expect(createReport(validReportData())).rejects.toMatchObject({
      statusCode: StatusCodes.NOT_FOUND,
    })
  })

  it('403s when a driver targets a driver', async () => {
    mockReporter(USER_ROLES.DRIVER)

    await expect(
      createReport(validReportData({ targetType: REPORT_TARGET_TYPES.DRIVER }))
    ).rejects.toMatchObject({ statusCode: StatusCodes.FORBIDDEN })
  })

  it('403s when a company targets a company', async () => {
    mockReporter(USER_ROLES.COMPANY)

    await expect(
      createReport(validReportData({ targetType: REPORT_TARGET_TYPES.COMPANY }))
    ).rejects.toMatchObject({ statusCode: StatusCodes.FORBIDDEN })
  })

  it('400s when a fraud report has no targetEmail', async () => {
    mockReporter(USER_ROLES.DRIVER)

    await expect(createReport(validReportData({ targetEmail: '  ' }))).rejects.toMatchObject({
      statusCode: StatusCodes.BAD_REQUEST,
    })
  })

  it('404s when the fraud target email matches no collaborator', async () => {
    mockReporter(USER_ROLES.DRIVER)
    mockCollaboratorAggregates([], [])

    await expect(
      createReport(validReportData({ targetEmail: 'stranger@example.com' }))
    ).rejects.toMatchObject({ statusCode: StatusCodes.NOT_FOUND })
    expect(createReportMock).not.toHaveBeenCalled()
  })

  it('resolves fraud target from collaborators, matching email case-insensitively', async () => {
    mockReporter(USER_ROLES.DRIVER)
    mockCollaboratorAggregates([ACME])
    createReportMock.mockResolvedValue({ _id: 'report-1' } as never)

    await createReport(validReportData({ targetEmail: 'ACME@example.com', targetName: 'spoofed' }))

    expect(createReportMock).toHaveBeenCalledWith(
      expect.objectContaining({ targetName: 'Acme Logistics' })
    )
    const created = createReportMock.mock.calls[0][0] as { targetId: { toString(): string } }
    expect(created.targetId.toString()).toBe(TARGET_ID)
  })

  it('accepts a target the reporter only hauled for (assigned load, no accepted bid)', async () => {
    mockReporter(USER_ROLES.DRIVER)
    mockCollaboratorAggregates([], [ACME])
    createReportMock.mockResolvedValue({ _id: 'report-1' } as never)

    await createReport(validReportData())

    expect(createReportMock).toHaveBeenCalledWith(
      expect.objectContaining({ targetName: 'Acme Logistics' })
    )
  })

  it('400s when an inaccurate report has no targetName', async () => {
    mockReporter(USER_ROLES.DRIVER)

    await expect(
      createReport(validReportData({ type: REPORT_TYPES.INACCURATE, targetName: '   ' }))
    ).rejects.toMatchObject({ statusCode: StatusCodes.BAD_REQUEST })
  })

  it("404s a driver's inaccurate report when the load id isn't one they've worked with", async () => {
    mockReporter(USER_ROLES.DRIVER)
    mockReportableLoads([])

    await expect(
      createReport(
        validReportData({
          type: REPORT_TYPES.INACCURATE,
          targetName: '00000000000000000000dead',
        })
      )
    ).rejects.toMatchObject({ statusCode: StatusCodes.NOT_FOUND })
    expect(createReportMock).not.toHaveBeenCalled()
  })

  it("404s a driver's inaccurate report when the reference is not a full load id", async () => {
    mockReporter(USER_ROLES.DRIVER)
    mockReportableLoads([{ _id: '000000000000000000000119' }])

    await expect(
      createReport(validReportData({ type: REPORT_TYPES.INACCURATE, targetName: 'Load #000119' }))
    ).rejects.toMatchObject({ statusCode: StatusCodes.NOT_FOUND })
  })

  it("resolves a driver's inaccurate report to the load's company with a human-readable targetName", async () => {
    const LOAD_ID = '000000000000000000000119'
    const COMPANY_ID = '000000000000000000000001'
    mockReporter(USER_ROLES.DRIVER)
    mockReportableLoads([{ _id: LOAD_ID, companyId: COMPANY_ID }])
    createReportMock.mockResolvedValue({ _id: 'report-1' } as never)

    await createReport(validReportData({ type: REPORT_TYPES.INACCURATE, targetName: LOAD_ID }))

    expect(createReportMock).toHaveBeenCalledWith(
      expect.objectContaining({ targetId: COMPANY_ID, targetName: 'Origin Rd → Destination Ave' })
    )
  })

  it("400s a company's inaccurate report with no targetEmail", async () => {
    mockReporter(USER_ROLES.COMPANY)

    await expect(
      createReport(
        validReportData({
          type: REPORT_TYPES.INACCURATE,
          targetType: REPORT_TARGET_TYPES.DRIVER,
          targetEmail: '  ',
        })
      )
    ).rejects.toMatchObject({ statusCode: StatusCodes.BAD_REQUEST })
  })

  it("404s a company's inaccurate report when the driver email matches no collaborator", async () => {
    mockReporter(USER_ROLES.COMPANY)
    mockCollaboratorAggregates([], [])

    await expect(
      createReport(
        validReportData({
          type: REPORT_TYPES.INACCURATE,
          targetType: REPORT_TARGET_TYPES.DRIVER,
          targetEmail: 'ghost@example.com',
        })
      )
    ).rejects.toMatchObject({ statusCode: StatusCodes.NOT_FOUND })
    expect(createReportMock).not.toHaveBeenCalled()
  })

  it("404s a company's inaccurate report when the email belongs to a registered driver who isn't a collaborator", async () => {
    mockReporter(USER_ROLES.COMPANY)
    // ALEX is a registered driver, just not one this company has worked with
    mockCollaboratorAggregates([], [])

    await expect(
      createReport(
        validReportData({
          type: REPORT_TYPES.INACCURATE,
          targetType: REPORT_TARGET_TYPES.DRIVER,
          targetEmail: 'alex@example.com',
        })
      )
    ).rejects.toMatchObject({ statusCode: StatusCodes.NOT_FOUND })
  })

  it("resolves targetId/targetName for a company's inaccurate report matching a collaborated driver's email, case-insensitively", async () => {
    const ALEX = { _id: TARGET_ID, name: 'Alex Trucker', email: 'alex@example.com' }
    mockReporter(USER_ROLES.COMPANY)
    mockCollaboratorAggregates([ALEX])
    createReportMock.mockResolvedValue({ _id: 'report-1' } as never)

    await createReport(
      validReportData({
        type: REPORT_TYPES.INACCURATE,
        targetType: REPORT_TARGET_TYPES.DRIVER,
        targetEmail: 'Alex@Example.com',
      })
    )

    expect(createReportMock).toHaveBeenCalledWith(
      expect.objectContaining({ targetName: 'Alex Trucker' })
    )
    const created = createReportMock.mock.calls[0][0] as { targetId: { toString(): string } }
    expect(created.targetId.toString()).toBe(TARGET_ID)
  })
})

describe('getReportableCollaborators', () => {
  it('400s on an invalid userId', async () => {
    await expect(getReportableCollaborators(INVALID_ID)).rejects.toMatchObject({
      statusCode: StatusCodes.BAD_REQUEST,
    })
  })

  it('returns [] when the user does not exist', async () => {
    const selectMock = jest.fn().mockResolvedValue(null)
    findByIdUserMock.mockReturnValue({ select: selectMock } as never)

    await expect(getReportableCollaborators(REPORTER_ID)).resolves.toEqual([])
  })

  it('merges accepted-bid and assigned-load collaborators without duplicates', async () => {
    mockReporter(USER_ROLES.DRIVER)
    const other = { _id: '000000000000000000000033', name: 'Beta Freight', email: 'beta@example.com' }
    mockCollaboratorAggregates([ACME], [ACME, other])

    const result = await getReportableCollaborators(REPORTER_ID)

    expect(result).toEqual([
      { _id: TARGET_ID, name: 'Acme Logistics', email: 'acme@example.com' },
      { _id: other._id, name: 'Beta Freight', email: 'beta@example.com' },
    ])
  })

  it('excludes the user themselves', async () => {
    mockReporter(USER_ROLES.COMPANY)
    mockCollaboratorAggregates([{ _id: REPORTER_ID, name: 'Me', email: 'me@example.com' }, ACME])

    const result = await getReportableCollaborators(REPORTER_ID)

    expect(result).toEqual([{ _id: TARGET_ID, name: 'Acme Logistics', email: 'acme@example.com' }])
  })
})

describe('getReportableLoads', () => {
  it('400s on an invalid driverId', async () => {
    await expect(getReportableLoads(INVALID_ID)).rejects.toMatchObject({
      statusCode: StatusCodes.BAD_REQUEST,
    })
  })

  it('only counts accepted bids, not merely submitted ones', async () => {
    mockReportableLoads([])

    await getReportableLoads(REPORTER_ID)

    expect(distinctBidMock).toHaveBeenCalledWith(
      'loadId',
      expect.objectContaining({ status: 'accepted' })
    )
  })

  it('returns loads from accepted bids or assigned loads', async () => {
    mockReportableLoads([{ _id: '000000000000000000000101' }, { _id: '000000000000000000000102' }])

    const result = await getReportableLoads(REPORTER_ID)

    expect(result).toEqual([
      {
        _id: '000000000000000000000101',
        originAddress: 'Origin Rd',
        destinationAddress: 'Destination Ave',
        commodity: 'Steel Coils',
        status: 'booked',
      },
      {
        _id: '000000000000000000000102',
        originAddress: 'Origin Rd',
        destinationAddress: 'Destination Ave',
        commodity: 'Steel Coils',
        status: 'booked',
      },
    ])
  })

  it('returns [] when the driver has no bids or assigned loads', async () => {
    mockReportableLoads([])

    await expect(getReportableLoads(REPORTER_ID)).resolves.toEqual([])
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
