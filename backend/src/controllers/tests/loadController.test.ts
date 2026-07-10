import httpMocks from 'node-mocks-http'
import { StatusCodes } from 'http-status-codes'
import { ApiError } from '../../utils/ApiError'
import { LoadModel } from '../../models/loads/Load'
import { LOAD_STATUSES } from '../../models/enums'
import * as loadService from '../../services/loadService'
import { onLoadPosted } from '../../events/auctionEvents'
import {
  getLoad,
  createLoad,
  streamNewLoads,
  updateLoad,
  listCompanyLoads,
  updateLoadStatus,
  updateLoadExpenses,
  listAvailableLoads,
  selectTruckForLoad,
} from '../loadController'
import type { AuthedUser } from '../../types/auth'

jest.mock('../../models/loads/Load')
jest.mock('../../services/loadService')
jest.mock('../../events/auctionEvents')
jest.mock('../../models/users/Driver', () => ({ DriverModel: { findOne: jest.fn() } }))

const findLoadByIdMock = jest.mocked(LoadModel.findById)
const findLoadByIdAndUpdateMock = jest.mocked(LoadModel.findByIdAndUpdate)
const getLoadMock = jest.mocked(loadService.getLoad)
const createLoadMock = jest.mocked(loadService.createLoad)
const updateLoadMock = jest.mocked(loadService.updateLoad)
const listCompanyLoadsMock = jest.mocked(loadService.listCompanyLoads)
const listAvailableLoadsMock = jest.mocked(loadService.listAvailableLoads)
const selectTruckForLoadMock = jest.mocked(loadService.selectTruckForLoad)
const onLoadPostedMock = jest.mocked(onLoadPosted)

const LOAD_ID = '000000000000000000000101'
const COMPANY_ID = '000000000000000000000001'
const DRIVER_ID = '000000000000000000000011'

function driverUser(): AuthedUser {
  return { _id: DRIVER_ID, role: 'driver', firebaseUid: 'uid-1', email: 'd@x.com' }
}

beforeEach(() => {
  jest.resetAllMocks()
})

describe('getLoad', () => {
  it('200s with the load', async () => {
    getLoadMock.mockResolvedValue({ _id: LOAD_ID } as never)
    const req = httpMocks.createRequest({ params: { loadId: LOAD_ID } })
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await getLoad(req, res, next)

    expect(getLoadMock).toHaveBeenCalledWith(LOAD_ID)
    expect(res.statusCode).toBe(StatusCodes.OK)
  })

  it('forwards errors to next', async () => {
    getLoadMock.mockRejectedValue(new ApiError(StatusCodes.NOT_FOUND, 'not found'))
    const req = httpMocks.createRequest({ params: { loadId: LOAD_ID } })
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await getLoad(req, res, next)

    expect(next).toHaveBeenCalledWith(expect.any(ApiError))
  })
})

describe('createLoad', () => {
  it('201s with the created load', async () => {
    createLoadMock.mockResolvedValue({ _id: LOAD_ID } as never)
    const req = httpMocks.createRequest({
      params: { companyId: COMPANY_ID },
      body: { startPrice: 500 },
    })
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await createLoad(req, res, next)

    expect(createLoadMock).toHaveBeenCalledWith(COMPANY_ID, { startPrice: 500 })
    expect(res.statusCode).toBe(StatusCodes.CREATED)
  })
})

describe('streamNewLoads', () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  it('subscribes to load-posted events and cleans up on close', async () => {
    let capturedListener: ((payload: unknown) => void) | undefined
    const unsubscribe = jest.fn()
    onLoadPostedMock.mockImplementation((listener) => {
      capturedListener = listener
      return unsubscribe
    })

    const req = httpMocks.createRequest()
    const res = httpMocks.createResponse()
    res.flushHeaders = jest.fn()

    await streamNewLoads(req, res)

    expect(res.getHeader('Content-Type')).toBe('text/event-stream')

    capturedListener?.({ loadId: LOAD_ID })
    expect(res._getData()).toContain(LOAD_ID)

    req.emit('close')
    expect(unsubscribe).toHaveBeenCalled()
  })
})

describe('updateLoad', () => {
  it('200s with the updated load', async () => {
    updateLoadMock.mockResolvedValue({ _id: LOAD_ID, notes: 'x' } as never)
    const req = httpMocks.createRequest({ params: { loadId: LOAD_ID }, body: { notes: 'x' } })
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await updateLoad(req, res, next)

    expect(updateLoadMock).toHaveBeenCalledWith(LOAD_ID, { notes: 'x' })
  })
})

describe('listCompanyLoads', () => {
  it('passes optional filters through from the query string', async () => {
    listCompanyLoadsMock.mockResolvedValue([] as never)
    const req = httpMocks.createRequest({
      params: { companyId: COMPANY_ID },
      query: { assignedDriverId: DRIVER_ID, excludeReviewedBy: COMPANY_ID },
    })
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await listCompanyLoads(req, res, next)

    expect(listCompanyLoadsMock).toHaveBeenCalledWith(COMPANY_ID, {
      assignedDriverId: DRIVER_ID,
      excludeReviewedBy: COMPANY_ID,
    })
  })
})

describe('updateLoadStatus', () => {
  it('400s on an invalid loadId', async () => {
    const req = httpMocks.createRequest({
      params: { loadId: 'bad-id' },
      user: driverUser(),
      body: { status: LOAD_STATUSES.InTransit },
    } as never)
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await updateLoadStatus(req, res, next)

    expect((next.mock.calls[0][0] as ApiError).statusCode).toBe(StatusCodes.BAD_REQUEST)
  })

  it('404s when the load does not exist', async () => {
    findLoadByIdMock.mockResolvedValue(null)
    const req = httpMocks.createRequest({
      params: { loadId: LOAD_ID },
      user: driverUser(),
      body: { status: LOAD_STATUSES.InTransit },
    } as never)
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await updateLoadStatus(req, res, next)

    expect((next.mock.calls[0][0] as ApiError).statusCode).toBe(StatusCodes.NOT_FOUND)
  })

  it('403s when the load is not assigned to this driver', async () => {
    findLoadByIdMock.mockResolvedValue({
      assignedDriverId: { toString: () => 'someone-else' },
    } as never)
    const req = httpMocks.createRequest({
      params: { loadId: LOAD_ID },
      user: driverUser(),
      body: { status: LOAD_STATUSES.InTransit },
    } as never)
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await updateLoadStatus(req, res, next)

    expect((next.mock.calls[0][0] as ApiError).statusCode).toBe(StatusCodes.FORBIDDEN)
  })

  it('400s on a disallowed status value', async () => {
    findLoadByIdMock.mockResolvedValue({
      assignedDriverId: { toString: () => DRIVER_ID },
    } as never)
    const req = httpMocks.createRequest({
      params: { loadId: LOAD_ID },
      user: driverUser(),
      body: { status: LOAD_STATUSES.AuctionLive },
    } as never)
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await updateLoadStatus(req, res, next)

    expect((next.mock.calls[0][0] as ApiError).statusCode).toBe(StatusCodes.BAD_REQUEST)
  })

  it('updates the status when the assigned driver requests an allowed transition', async () => {
    findLoadByIdMock.mockResolvedValue({
      assignedDriverId: { toString: () => DRIVER_ID },
    } as never)
    findLoadByIdAndUpdateMock.mockResolvedValue({ status: LOAD_STATUSES.InTransit } as never)
    const req = httpMocks.createRequest({
      params: { loadId: LOAD_ID },
      user: driverUser(),
      body: { status: LOAD_STATUSES.InTransit },
    } as never)
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await updateLoadStatus(req, res, next)

    expect(findLoadByIdAndUpdateMock).toHaveBeenCalledWith(
      LOAD_ID,
      { status: LOAD_STATUSES.InTransit },
      { new: true }
    )
    expect(res.statusCode).toBe(StatusCodes.OK)
  })
})

describe('updateLoadExpenses', () => {
  it('400s on an invalid loadId', async () => {
    const req = httpMocks.createRequest({ params: { loadId: 'bad-id' }, body: {} })
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await updateLoadExpenses(req, res, next)

    expect((next.mock.calls[0][0] as ApiError).statusCode).toBe(StatusCodes.BAD_REQUEST)
  })

  it('404s when the load does not exist', async () => {
    findLoadByIdMock.mockResolvedValue(null)
    const req = httpMocks.createRequest({ params: { loadId: LOAD_ID }, body: {} })
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await updateLoadExpenses(req, res, next)

    expect((next.mock.calls[0][0] as ApiError).statusCode).toBe(StatusCodes.NOT_FOUND)
  })

  it('403s when there is no assigned driver', async () => {
    findLoadByIdMock.mockResolvedValue({ assignedDriverId: null } as never)
    const req = httpMocks.createRequest({
      params: { loadId: LOAD_ID },
      body: { fuelCostPerLiter: 2 },
    })
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await updateLoadExpenses(req, res, next)

    expect((next.mock.calls[0][0] as ApiError).statusCode).toBe(StatusCodes.FORBIDDEN)
  })

  it('400s when no allowed expense fields are present', async () => {
    findLoadByIdMock.mockResolvedValue({ assignedDriverId: DRIVER_ID } as never)
    const req = httpMocks.createRequest({ params: { loadId: LOAD_ID }, body: { bogus: 1 } })
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await updateLoadExpenses(req, res, next)

    expect((next.mock.calls[0][0] as ApiError).statusCode).toBe(StatusCodes.BAD_REQUEST)
  })

  it('namespaces allowed fields under expenseOverrides', async () => {
    findLoadByIdMock.mockResolvedValue({ assignedDriverId: DRIVER_ID } as never)
    findLoadByIdAndUpdateMock.mockResolvedValue({ _id: LOAD_ID } as never)
    const req = httpMocks.createRequest({
      params: { loadId: LOAD_ID },
      body: { fuelCostPerLiter: 2, maintenancePerKm: null },
    })
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await updateLoadExpenses(req, res, next)

    expect(findLoadByIdAndUpdateMock).toHaveBeenCalledWith(
      LOAD_ID,
      {
        $set: {
          'expenseOverrides.fuelCostPerLiter': 2,
          'expenseOverrides.maintenancePerKm': null,
        },
      },
      { new: true, runValidators: true }
    )
  })
})

describe('listAvailableLoads', () => {
  it('passes the optional status filter through', async () => {
    listAvailableLoadsMock.mockResolvedValue([] as never)
    const req = httpMocks.createRequest({ query: { status: LOAD_STATUSES.Booked } })
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await listAvailableLoads(req, res, next)

    expect(listAvailableLoadsMock).toHaveBeenCalledWith(LOAD_STATUSES.Booked, undefined)
  })
})

describe('selectTruckForLoad', () => {
  it('404s when there is no driver for the authenticated firebaseUid', async () => {
    const { DriverModel } = await import('../../models/users/Driver')
    jest.mocked(DriverModel.findOne).mockResolvedValue(null)

    const req = httpMocks.createRequest({
      params: { loadId: LOAD_ID },
      firebaseUid: 'uid-1',
      body: {},
    } as never)
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await selectTruckForLoad(req, res, next)

    expect((next.mock.calls[0][0] as ApiError).statusCode).toBe(StatusCodes.NOT_FOUND)
  })

  it('resolves the driver id and clears the truck when truckId is omitted', async () => {
    const { DriverModel } = await import('../../models/users/Driver')
    jest.mocked(DriverModel.findOne).mockResolvedValue({ _id: DRIVER_ID } as never)
    selectTruckForLoadMock.mockResolvedValue({ _id: LOAD_ID } as never)

    const req = httpMocks.createRequest({
      params: { loadId: LOAD_ID },
      firebaseUid: 'uid-1',
      body: {},
    } as never)
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await selectTruckForLoad(req, res, next)

    expect(selectTruckForLoadMock).toHaveBeenCalledWith(LOAD_ID, DRIVER_ID, null)
    expect(res.statusCode).toBe(StatusCodes.OK)
  })
})