import httpMocks from 'node-mocks-http'
import { StatusCodes } from 'http-status-codes'
import { ApiError } from '../../utils/ApiError'
import * as driverService from '../../services/driverService'
import {
  listDriverBids,
  listDriverLoads,
  getRecommendedLoads,
  getScoredLoads,
  getDriverProfile,
  updateDriverProfile,
  getDriverRevenue,
  updateDriverExpenses,
} from '../driverController'

jest.mock('../../services/driverService')

const listDriverBidsMock = jest.mocked(driverService.listDriverBids)
const listDriverLoadsMock = jest.mocked(driverService.listDriverLoads)
const getRecommendedLoadsMock = jest.mocked(driverService.getRecommendedLoads)
const getScoredLoadsMock = jest.mocked(driverService.getScoredLoads)
const getDriverProfileMock = jest.mocked(driverService.getDriverProfile)
const updateDriverProfileMock = jest.mocked(driverService.updateDriverProfile)
const getDriverRevenueMock = jest.mocked(driverService.getDriverRevenue)
const updateDriverExpensesMock = jest.mocked(driverService.updateDriverExpenses)

const DRIVER_ID = '000000000000000000000011'

beforeEach(() => {
  jest.resetAllMocks()
})

describe('listDriverBids', () => {
  it('passes the optional status filter through', async () => {
    listDriverBidsMock.mockResolvedValue([] as never)
    const req = httpMocks.createRequest({
      params: { driverId: DRIVER_ID },
      query: { status: 'submitted' },
    })
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await listDriverBids(req, res, next)

    expect(listDriverBidsMock).toHaveBeenCalledWith(DRIVER_ID, 'submitted')
    expect(res.statusCode).toBe(StatusCodes.OK)
  })

  it('forwards errors to next', async () => {
    listDriverBidsMock.mockRejectedValue(new ApiError(StatusCodes.BAD_REQUEST, 'bad id'))
    const req = httpMocks.createRequest({ params: { driverId: DRIVER_ID }, query: {} })
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await listDriverBids(req, res, next)

    expect(next).toHaveBeenCalledWith(expect.any(ApiError))
  })
})

describe('listDriverLoads', () => {
  it("200s with the driver's loads", async () => {
    listDriverLoadsMock.mockResolvedValue([{ _id: 'load-1' }] as never)
    const req = httpMocks.createRequest({ params: { driverId: DRIVER_ID }, query: {} })
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await listDriverLoads(req, res, next)

    expect(res._getJSONData()).toEqual([{ _id: 'load-1' }])
  })
})

describe('getRecommendedLoads', () => {
  it('200s with recommended loads', async () => {
    getRecommendedLoadsMock.mockResolvedValue([] as never)
    const req = httpMocks.createRequest({ params: { driverId: DRIVER_ID } })
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await getRecommendedLoads(req, res, next)

    expect(getRecommendedLoadsMock).toHaveBeenCalledWith(DRIVER_ID)
    expect(res.statusCode).toBe(StatusCodes.OK)
  })
})

describe('getScoredLoads', () => {
  it('passes null location when lat/lng are absent', async () => {
    getScoredLoadsMock.mockResolvedValue([] as never)
    const req = httpMocks.createRequest({ params: { driverId: DRIVER_ID }, query: {} })
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await getScoredLoads(req, res, next)

    expect(getScoredLoadsMock).toHaveBeenCalledWith(DRIVER_ID, null)
    expect(res.statusCode).toBe(StatusCodes.OK)
  })

  it('parses valid lat/lng query params into a coordinate', async () => {
    getScoredLoadsMock.mockResolvedValue([] as never)
    const req = httpMocks.createRequest({
      params: { driverId: DRIVER_ID },
      query: { lat: '43.6532', lng: '-79.3832' },
    })
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await getScoredLoads(req, res, next)

    expect(getScoredLoadsMock).toHaveBeenCalledWith(DRIVER_ID, { lat: 43.6532, lng: -79.3832 })
  })

  it.each([
    ['non-numeric lat', { lat: 'nope', lng: '-79.3832' }],
    ['out-of-range lat', { lat: '999', lng: '-79.3832' }],
    ['out-of-range lng', { lat: '43.6532', lng: '-999' }],
    ['lng missing', { lat: '43.6532' }],
  ])('falls back to null location on %s', async (_label, query) => {
    getScoredLoadsMock.mockResolvedValue([] as never)
    const req = httpMocks.createRequest({ params: { driverId: DRIVER_ID }, query })
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await getScoredLoads(req, res, next)

    expect(getScoredLoadsMock).toHaveBeenCalledWith(DRIVER_ID, null)
  })

  it('forwards errors to next', async () => {
    getScoredLoadsMock.mockRejectedValue(new ApiError(StatusCodes.NOT_FOUND, 'not found'))
    const req = httpMocks.createRequest({ params: { driverId: DRIVER_ID }, query: {} })
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await getScoredLoads(req, res, next)

    expect(next).toHaveBeenCalledWith(expect.any(ApiError))
  })
})

describe('getDriverProfile', () => {
  it('200s with the driver profile', async () => {
    getDriverProfileMock.mockResolvedValue({ name: 'Driver One' } as never)
    const req = httpMocks.createRequest({ params: { driverId: DRIVER_ID } })
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await getDriverProfile(req, res, next)

    expect(res._getJSONData()).toEqual({ name: 'Driver One' })
  })

  it('forwards errors to next', async () => {
    getDriverProfileMock.mockRejectedValue(new ApiError(StatusCodes.NOT_FOUND, 'not found'))
    const req = httpMocks.createRequest({ params: { driverId: DRIVER_ID } })
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await getDriverProfile(req, res, next)

    expect(next).toHaveBeenCalledWith(expect.any(ApiError))
  })
})

describe('updateDriverProfile', () => {
  it('200s with the updated profile', async () => {
    updateDriverProfileMock.mockResolvedValue({ name: 'New Name' } as never)
    const req = httpMocks.createRequest({
      params: { driverId: DRIVER_ID },
      body: { name: 'New Name' },
    })
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await updateDriverProfile(req, res, next)

    expect(updateDriverProfileMock).toHaveBeenCalledWith(DRIVER_ID, { name: 'New Name' })
    expect(res.statusCode).toBe(StatusCodes.OK)
  })
})

describe('getDriverRevenue', () => {
  it('passes query params through as-is', async () => {
    getDriverRevenueMock.mockResolvedValue({ totalRevenue: 0 } as never)
    const req = httpMocks.createRequest({
      params: { driverId: DRIVER_ID },
      query: { minPayout: '100' },
    })
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await getDriverRevenue(req, res, next)

    expect(getDriverRevenueMock).toHaveBeenCalledWith(DRIVER_ID, { minPayout: '100' })
  })
})

describe('updateDriverExpenses', () => {
  it('200s with the updated expenses', async () => {
    updateDriverExpensesMock.mockResolvedValue({ expensePreferences: {} } as never)
    const req = httpMocks.createRequest({
      params: { driverId: DRIVER_ID },
      body: { fuelCostPerLiter: 2 },
    })
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await updateDriverExpenses(req, res, next)

    expect(updateDriverExpensesMock).toHaveBeenCalledWith(DRIVER_ID, { fuelCostPerLiter: 2 })
    expect(res.statusCode).toBe(StatusCodes.OK)
  })
})
