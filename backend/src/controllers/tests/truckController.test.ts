import httpMocks from 'node-mocks-http'
import { StatusCodes } from 'http-status-codes'
import { ApiError } from '../../utils/ApiError'
import * as truckService from '../../services/truckService'
import {
  listDriverTrucks,
  getTruck,
  createTruck,
  updateTruck,
  deleteTruck,
  setPrimaryTruck,
  updateTruckExpenses,
} from '../truckController'

jest.mock('../../services/truckService')

const listTrucksMock = jest.mocked(truckService.listTrucks)
const getTruckMock = jest.mocked(truckService.getTruck)
const createTruckMock = jest.mocked(truckService.createTruck)
const updateTruckMock = jest.mocked(truckService.updateTruck)
const deleteTruckMock = jest.mocked(truckService.deleteTruck)
const setPrimaryTruckMock = jest.mocked(truckService.setPrimaryTruck)
const updateTruckExpensesMock = jest.mocked(truckService.updateTruckExpenses)

const DRIVER_ID = '000000000000000000000011'
const TRUCK_ID = '000000000000000000000401'

beforeEach(() => {
  jest.resetAllMocks()
})

describe('listDriverTrucks', () => {
  it('200s with the trucks', async () => {
    listTrucksMock.mockResolvedValue([{ _id: TRUCK_ID }] as never)
    const req = httpMocks.createRequest({ params: { driverId: DRIVER_ID } })
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await listDriverTrucks(req, res, next)

    expect(listTrucksMock).toHaveBeenCalledWith(DRIVER_ID)
    expect(res.statusCode).toBe(StatusCodes.OK)
    expect(res._getJSONData()).toEqual([{ _id: TRUCK_ID }])
  })

  it('forwards errors to next', async () => {
    listTrucksMock.mockRejectedValue(new ApiError(StatusCodes.NOT_FOUND, 'no driver'))
    const req = httpMocks.createRequest({ params: { driverId: DRIVER_ID } })
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await listDriverTrucks(req, res, next)

    expect(next).toHaveBeenCalledWith(expect.any(ApiError))
  })
})

describe('getTruck', () => {
  it('200s with the truck', async () => {
    getTruckMock.mockResolvedValue({ _id: TRUCK_ID } as never)
    const req = httpMocks.createRequest({ params: { driverId: DRIVER_ID, truckId: TRUCK_ID } })
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await getTruck(req, res, next)

    expect(getTruckMock).toHaveBeenCalledWith(DRIVER_ID, TRUCK_ID)
    expect(res.statusCode).toBe(StatusCodes.OK)
  })

  it('forwards errors to next', async () => {
    getTruckMock.mockRejectedValue(new ApiError(StatusCodes.NOT_FOUND, 'not found'))
    const req = httpMocks.createRequest({ params: { driverId: DRIVER_ID, truckId: TRUCK_ID } })
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await getTruck(req, res, next)

    expect(next).toHaveBeenCalledWith(expect.any(ApiError))
  })
})

describe('createTruck', () => {
  it('201s with the created truck', async () => {
    createTruckMock.mockResolvedValue({ _id: TRUCK_ID } as never)
    const req = httpMocks.createRequest({
      params: { driverId: DRIVER_ID },
      body: { type: 'flatbed' },
    })
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await createTruck(req, res, next)

    expect(createTruckMock).toHaveBeenCalledWith(DRIVER_ID, { type: 'flatbed' })
    expect(res.statusCode).toBe(StatusCodes.CREATED)
  })

  it('forwards errors to next', async () => {
    createTruckMock.mockRejectedValue(new ApiError(StatusCodes.BAD_REQUEST, 'invalid'))
    const req = httpMocks.createRequest({ params: { driverId: DRIVER_ID }, body: {} })
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await createTruck(req, res, next)

    expect(next).toHaveBeenCalledWith(expect.any(ApiError))
  })
})

describe('updateTruck', () => {
  it('200s with the updated truck', async () => {
    updateTruckMock.mockResolvedValue({ _id: TRUCK_ID, type: 'reefer' } as never)
    const req = httpMocks.createRequest({
      params: { driverId: DRIVER_ID, truckId: TRUCK_ID },
      body: { type: 'reefer' },
    })
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await updateTruck(req, res, next)

    expect(updateTruckMock).toHaveBeenCalledWith(DRIVER_ID, TRUCK_ID, { type: 'reefer' })
    expect(res.statusCode).toBe(StatusCodes.OK)
  })

  it('forwards errors to next', async () => {
    updateTruckMock.mockRejectedValue(new ApiError(StatusCodes.NOT_FOUND, 'not found'))
    const req = httpMocks.createRequest({
      params: { driverId: DRIVER_ID, truckId: TRUCK_ID },
      body: {},
    })
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await updateTruck(req, res, next)

    expect(next).toHaveBeenCalledWith(expect.any(ApiError))
  })
})

describe('deleteTruck', () => {
  it('204s with no body', async () => {
    deleteTruckMock.mockResolvedValue(undefined as never)
    const req = httpMocks.createRequest({ params: { driverId: DRIVER_ID, truckId: TRUCK_ID } })
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await deleteTruck(req, res, next)

    expect(deleteTruckMock).toHaveBeenCalledWith(DRIVER_ID, TRUCK_ID)
    expect(res.statusCode).toBe(StatusCodes.NO_CONTENT)
  })

  it('forwards errors to next', async () => {
    deleteTruckMock.mockRejectedValue(new ApiError(StatusCodes.NOT_FOUND, 'not found'))
    const req = httpMocks.createRequest({ params: { driverId: DRIVER_ID, truckId: TRUCK_ID } })
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await deleteTruck(req, res, next)

    expect(next).toHaveBeenCalledWith(expect.any(ApiError))
  })
})

describe('setPrimaryTruck', () => {
  it('200s with the updated truck', async () => {
    setPrimaryTruckMock.mockResolvedValue({ _id: TRUCK_ID, isPrimary: true } as never)
    const req = httpMocks.createRequest({ params: { driverId: DRIVER_ID, truckId: TRUCK_ID } })
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await setPrimaryTruck(req, res, next)

    expect(setPrimaryTruckMock).toHaveBeenCalledWith(DRIVER_ID, TRUCK_ID)
    expect(res.statusCode).toBe(StatusCodes.OK)
  })

  it('forwards errors to next', async () => {
    setPrimaryTruckMock.mockRejectedValue(new ApiError(StatusCodes.NOT_FOUND, 'not found'))
    const req = httpMocks.createRequest({ params: { driverId: DRIVER_ID, truckId: TRUCK_ID } })
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await setPrimaryTruck(req, res, next)

    expect(next).toHaveBeenCalledWith(expect.any(ApiError))
  })
})

describe('updateTruckExpenses', () => {
  it('200s with the updated truck', async () => {
    updateTruckExpensesMock.mockResolvedValue({ _id: TRUCK_ID } as never)
    const req = httpMocks.createRequest({
      params: { driverId: DRIVER_ID, truckId: TRUCK_ID },
      body: { fuelEfficiencyKmPerLiter: 3.5 },
    })
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await updateTruckExpenses(req, res, next)

    expect(updateTruckExpensesMock).toHaveBeenCalledWith(DRIVER_ID, TRUCK_ID, {
      fuelEfficiencyKmPerLiter: 3.5,
    })
    expect(res.statusCode).toBe(StatusCodes.OK)
  })

  it('forwards errors to next', async () => {
    updateTruckExpensesMock.mockRejectedValue(new ApiError(StatusCodes.NOT_FOUND, 'not found'))
    const req = httpMocks.createRequest({
      params: { driverId: DRIVER_ID, truckId: TRUCK_ID },
      body: {},
    })
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await updateTruckExpenses(req, res, next)

    expect(next).toHaveBeenCalledWith(expect.any(ApiError))
  })
})
