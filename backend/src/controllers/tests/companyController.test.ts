import httpMocks from 'node-mocks-http'
import { StatusCodes } from 'http-status-codes'
import { CompanyModel } from '../../models/users/Company'
import { LoadModel } from '../../models/loads/Load'
import { BidModel } from '../../models/loads/Bid'
import { LOAD_STATUSES } from '../../models/enums'
import { listCompanies, getCompanyDashboard } from '../companyController'

jest.mock('../../models/users/Company', () => ({ CompanyModel: { find: jest.fn() } }))
jest.mock('../../models/loads/Load')
jest.mock('../../models/loads/Bid')

const findCompanyMock = jest.mocked(CompanyModel.find)
const findLoadMock = jest.mocked(LoadModel.find)
const aggregateBidMock = jest.mocked(BidModel.aggregate)
const countBidMock = jest.mocked(BidModel.countDocuments)

const COMPANY_ID = '000000000000000000000001'

function fakeLoad(overrides: Record<string, unknown> = {}): Record<string, any> {
  return {
    _id: { toString: () => 'load-1' },
    status: LOAD_STATUSES.AuctionLive,
    toJSON: () => ({ _id: 'load-1', status: LOAD_STATUSES.AuctionLive }),
    ...overrides,
  }
}

beforeEach(() => {
  jest.resetAllMocks()
})

describe('listCompanies', () => {
  it('200s with the selected fields', async () => {
    const selectMock = jest.fn().mockResolvedValue([{ _id: COMPANY_ID }])
    findCompanyMock.mockReturnValue({ select: selectMock } as never)
    const req = httpMocks.createRequest()
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await listCompanies(req, res, next)

    expect(selectMock).toHaveBeenCalledWith('_id name email companyName contactName')
    expect(res.statusCode).toBe(StatusCodes.OK)
  })

  it('forwards errors to next', async () => {
    findCompanyMock.mockImplementation(() => {
      throw new Error('db down')
    })
    const req = httpMocks.createRequest()
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await listCompanies(req, res, next)

    expect(next).toHaveBeenCalledWith(expect.any(Error))
  })
})

describe('getCompanyDashboard', () => {
  it('enriches loads with bid counts and computes summary stats', async () => {
    const loads = [
      fakeLoad({ _id: { toString: () => 'load-1' }, status: LOAD_STATUSES.AuctionLive }),
      fakeLoad({ _id: { toString: () => 'load-2' }, status: LOAD_STATUSES.InTransit }),
      fakeLoad({ _id: { toString: () => 'load-3' }, status: LOAD_STATUSES.Completed }),
    ]
    const populateMock = jest.fn().mockReturnThis()
    const sortMock = jest.fn().mockReturnValue({ populate: populateMock })
    findLoadMock.mockReturnValue({ sort: sortMock } as never)
    populateMock.mockReturnValueOnce({ populate: jest.fn().mockResolvedValue(loads) })
    aggregateBidMock.mockResolvedValue([{ _id: 'load-1', count: 3 }])
    countBidMock.mockResolvedValue(2)

    const req = httpMocks.createRequest({ params: { companyId: COMPANY_ID } })
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await getCompanyDashboard(req, res, next)

    const body = res._getJSONData()
    expect(body.loads[0].bidCount).toBe(3)
    expect(body.loads[1].bidCount).toBe(0)
    expect(body.summary).toEqual({
      activeLoads: 2,
      liveAuctions: 1,
      inTransit: 1,
      totalBidsToday: 2,
    })
  })

  it('forwards errors to next', async () => {
    findLoadMock.mockImplementation(() => {
      throw new Error('db down')
    })
    const req = httpMocks.createRequest({ params: { companyId: COMPANY_ID } })
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await getCompanyDashboard(req, res, next)

    expect(next).toHaveBeenCalledWith(expect.any(Error))
  })
})
