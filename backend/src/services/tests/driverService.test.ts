import { StatusCodes } from 'http-status-codes'
import { BidModel } from '../../models/loads/Bid'
import { LoadModel } from '../../models/loads/Load'
import { DriverModel } from '../../models/users/Driver'
import { TruckModel } from '../../models/trucks/Truck'
import { LOAD_STATUSES } from '../../models/enums'
import * as uploadService from '../uploadService'
import {
  haversineKm,
  listDriverBids,
  listDriverLoads,
  getRecommendedLoads,
  listDriverTrucks,
  getDriverProfile,
  updateDriverProfile,
  getDriverRevenue,
  updateDriverExpenses,
} from '../driverService'

jest.mock('../../models/loads/Bid')
jest.mock('../../models/loads/Load')
jest.mock('../../models/users/Driver', () => ({
  DriverModel: { findById: jest.fn(), findByIdAndUpdate: jest.fn() },
}))
jest.mock('../../models/trucks/Truck', () => ({ TruckModel: { find: jest.fn() } }))
jest.mock('../uploadService')

const findBidMock = jest.mocked(BidModel.find)
const findLoadMock = jest.mocked(LoadModel.find)
const findDriverByIdMock = jest.mocked(DriverModel.findById)
const findDriverByIdAndUpdateMock = jest.mocked(DriverModel.findByIdAndUpdate)
const findTruckMock = jest.mocked(TruckModel.find)
const toViewableUrlMock = jest.mocked(uploadService.toViewableUrl)
const createDownloadUrlMock = jest.mocked(uploadService.createDownloadUrl)
const deleteObjectByUrlMock = jest.mocked(uploadService.deleteObjectByUrl)

const DRIVER_ID = '000000000000000000000011'
const TRUCK_ID = '000000000000000000000401'
const INVALID_ID = 'not-an-object-id'

/** A chainable, thenable stand-in for a Mongoose Query: every chain method
 * (populate/sort/select/lean) returns itself, and awaiting it resolves to
 * `result` — regardless of call order or whether `.lean()` was invoked. */
function queryChain(result: unknown) {
  const obj: Record<string, unknown> = {}
  obj.populate = jest.fn().mockReturnValue(obj)
  obj.sort = jest.fn().mockReturnValue(obj)
  obj.select = jest.fn().mockReturnValue(obj)
  obj.lean = jest.fn().mockReturnValue(obj)
  obj.then = (resolve: (v: unknown) => void, reject?: (e: unknown) => void) =>
    Promise.resolve(result).then(resolve, reject)
  return obj
}

beforeEach(() => {
  jest.resetAllMocks()
  toViewableUrlMock.mockImplementation(async (url) => (url ? `signed:${url}` : undefined))
  createDownloadUrlMock.mockImplementation(async (key) => `signed:${key}`)
})

describe('haversineKm', () => {
  it('returns 0 for identical points', () => {
    expect(haversineKm(45, -75, 45, -75)).toBe(0)
  })

  it('computes a plausible distance between two known points', () => {
    // Toronto -> Montreal, roughly 500km great-circle
    const km = haversineKm(43.6532, -79.3832, 45.5019, -73.5674)
    expect(km).toBeGreaterThan(450)
    expect(km).toBeLessThan(600)
  })
})

describe('listDriverBids', () => {
  it('400s on an invalid driverId', async () => {
    await expect(listDriverBids(INVALID_ID)).rejects.toMatchObject({
      statusCode: StatusCodes.BAD_REQUEST,
    })
  })

  it('filters by driverId only when no status is given', async () => {
    findBidMock.mockReturnValue(queryChain([]) as never)

    await listDriverBids(DRIVER_ID)

    expect(findBidMock).toHaveBeenCalledWith({ driverId: expect.anything() })
  })

  it('adds a status filter when provided', async () => {
    findBidMock.mockReturnValue(queryChain([]) as never)

    await listDriverBids(DRIVER_ID, 'submitted')

    expect(findBidMock).toHaveBeenCalledWith(expect.objectContaining({ status: 'submitted' }))
  })
})

describe('listDriverLoads', () => {
  it('400s on an invalid driverId', async () => {
    await expect(listDriverLoads(INVALID_ID)).rejects.toMatchObject({
      statusCode: StatusCodes.BAD_REQUEST,
    })
  })

  it('filters by assignedDriverId', async () => {
    findLoadMock.mockReturnValue(queryChain([]) as never)

    await listDriverLoads(DRIVER_ID)

    expect(findLoadMock).toHaveBeenCalledWith({ assignedDriverId: expect.anything() })
  })
})

describe('getRecommendedLoads', () => {
  it('400s on an invalid driverId', async () => {
    await expect(getRecommendedLoads(INVALID_ID)).rejects.toMatchObject({
      statusCode: StatusCodes.BAD_REQUEST,
    })
  })

  it('does not filter by truck type when the driver has no trucks', async () => {
    findTruckMock.mockReturnValue(queryChain([]) as never)
    findLoadMock.mockReturnValue(queryChain([]) as never)

    await getRecommendedLoads(DRIVER_ID)

    expect(findLoadMock).toHaveBeenCalledWith({ status: LOAD_STATUSES.AuctionLive })
  })

  it("filters by the driver's (deduplicated) truck types", async () => {
    findTruckMock.mockReturnValue(
      queryChain([
        { truckType: 'DryVan' },
        { truckType: 'DryVan' },
        { truckType: 'Reefer' },
      ]) as never
    )
    findLoadMock.mockReturnValue(queryChain([]) as never)

    await getRecommendedLoads(DRIVER_ID)

    expect(findLoadMock).toHaveBeenCalledWith({
      status: LOAD_STATUSES.AuctionLive,
      truckType: { $in: ['DryVan', 'Reefer'] },
    })
  })
})

describe('listDriverTrucks', () => {
  it('400s on an invalid driverId', async () => {
    await expect(listDriverTrucks(INVALID_ID)).rejects.toMatchObject({
      statusCode: StatusCodes.BAD_REQUEST,
    })
  })

  it('sorts primary trucks first, then newest', async () => {
    findTruckMock.mockReturnValue(queryChain([]) as never)

    await listDriverTrucks(DRIVER_ID)

    const chain = findTruckMock.mock.results[0].value as { sort: jest.Mock }
    expect(chain.sort).toHaveBeenCalledWith({ isPrimary: -1, createdAt: -1 })
  })
})

describe('getDriverProfile', () => {
  it('400s on an invalid driverId', async () => {
    await expect(getDriverProfile(INVALID_ID)).rejects.toMatchObject({
      statusCode: StatusCodes.BAD_REQUEST,
    })
  })

  it('404s when the driver does not exist', async () => {
    findDriverByIdMock.mockReturnValue(queryChain(null) as never)

    await expect(getDriverProfile(DRIVER_ID)).rejects.toMatchObject({
      statusCode: StatusCodes.NOT_FOUND,
    })
  })

  it('swaps stored S3 urls for signed viewable urls', async () => {
    findDriverByIdMock.mockReturnValue(
      queryChain({
        profilePictureUrl: 'raw-pfp-url',
        certificationDocuments: [
          { name: 'Hazmat', url: 'raw-doc-url', key: 'doc-key', uploadedAt: '2026-01-01' },
        ],
      }) as never
    )

    const result = await getDriverProfile(DRIVER_ID)

    expect(result.profilePictureUrl).toBe('signed:raw-pfp-url')
    expect((result.certificationDocuments as never as { url: string }[])[0].url).toBe(
      'signed:doc-key'
    )
  })
})

describe('updateDriverProfile', () => {
  it('400s on an invalid driverId', async () => {
    await expect(updateDriverProfile(INVALID_ID, { name: 'x' })).rejects.toMatchObject({
      statusCode: StatusCodes.BAD_REQUEST,
    })
  })

  it('400s when no allowed fields are present', async () => {
    await expect(updateDriverProfile(DRIVER_ID, { notAllowed: 'x' })).rejects.toMatchObject({
      statusCode: StatusCodes.BAD_REQUEST,
    })
  })

  it('404s when the driver does not exist', async () => {
    findDriverByIdAndUpdateMock.mockReturnValue(queryChain(null) as never)

    await expect(updateDriverProfile(DRIVER_ID, { name: 'New Name' })).rejects.toMatchObject({
      statusCode: StatusCodes.NOT_FOUND,
    })
  })

  it('deletes the old profile picture when it is replaced with a different one', async () => {
    findDriverByIdMock.mockReturnValue(queryChain({ profilePictureUrl: 'old-url' }) as never)
    findDriverByIdAndUpdateMock.mockReturnValue(
      queryChain({ profilePictureUrl: 'new-url' }) as never
    )

    await updateDriverProfile(DRIVER_ID, { profilePictureUrl: 'new-url' })

    expect(deleteObjectByUrlMock).toHaveBeenCalledWith('old-url')
  })

  it('does not delete the old picture when the url is unchanged', async () => {
    findDriverByIdMock.mockReturnValue(queryChain({ profilePictureUrl: 'same-url' }) as never)
    findDriverByIdAndUpdateMock.mockReturnValue(
      queryChain({ profilePictureUrl: 'same-url' }) as never
    )

    await updateDriverProfile(DRIVER_ID, { profilePictureUrl: 'same-url' })

    expect(deleteObjectByUrlMock).not.toHaveBeenCalled()
  })

  it('updates and returns the viewable driver profile', async () => {
    findDriverByIdAndUpdateMock.mockReturnValue(queryChain({ name: 'New Name' }) as never)

    const result = await updateDriverProfile(DRIVER_ID, { name: 'New Name' })

    expect(findDriverByIdAndUpdateMock).toHaveBeenCalledWith(
      expect.anything(),
      { $set: { name: 'New Name' } },
      { new: true, runValidators: true }
    )
    expect(result.name).toBe('New Name')
  })
})

describe('getDriverRevenue', () => {
  it('400s on an invalid driverId', async () => {
    await expect(getDriverRevenue(INVALID_ID, {})).rejects.toMatchObject({
      statusCode: StatusCodes.BAD_REQUEST,
    })
  })

  it('404s when the driver does not exist', async () => {
    findDriverByIdMock.mockReturnValue(queryChain(null) as never)

    await expect(getDriverRevenue(DRIVER_ID, {})).rejects.toMatchObject({
      statusCode: StatusCodes.NOT_FOUND,
    })
  })

  it('defaults to the completed-load status filter and computes revenue/expenses', async () => {
    findDriverByIdMock.mockReturnValue(queryChain({ expensePreferences: null }) as never)
    findTruckMock.mockReturnValue(queryChain([]) as never)
    findLoadMock.mockReturnValue(
      queryChain([
        {
          _id: 'load-1',
          status: LOAD_STATUSES.Completed,
          auctionId: { currentPrice: 1000, capPrice: 1200 },
          route: { distanceKm: 200 },
          selectedTruckId: null,
        },
      ]) as never
    )

    const result = await getDriverRevenue(DRIVER_ID, {})

    expect(findLoadMock).toHaveBeenCalledWith(
      expect.objectContaining({ status: { $in: [LOAD_STATUSES.Completed] } })
    )
    expect(result.totalRevenue).toBe(1000)
    expect(result.completedLoadsCount).toBe(1)
    expect(result.loadBreakdown[0]).toMatchObject({ payout: 1000, distanceKm: 200 })
  })

  it('splits a comma-separated status filter', async () => {
    findDriverByIdMock.mockReturnValue(queryChain({}) as never)
    findTruckMock.mockReturnValue(queryChain([]) as never)
    findLoadMock.mockReturnValue(queryChain([]) as never)

    await getDriverRevenue(DRIVER_ID, { status: 'completed, in_transit' })

    expect(findLoadMock).toHaveBeenCalledWith(
      expect.objectContaining({ status: { $in: ['completed', 'in_transit'] } })
    )
  })

  it('falls back to haversine distance when no route is stored', async () => {
    findDriverByIdMock.mockReturnValue(queryChain({}) as never)
    findTruckMock.mockReturnValue(queryChain([]) as never)
    findLoadMock.mockReturnValue(
      queryChain([
        {
          _id: 'load-1',
          auctionId: { currentPrice: 500 },
          route: null,
          originCoords: { lat: 43.6532, lng: -79.3832 },
          destinationCoords: { lat: 45.5019, lng: -73.5674 },
          selectedTruckId: null,
        },
      ]) as never
    )

    const result = await getDriverRevenue(DRIVER_ID, {})

    expect(result.totalDistanceKm).toBeGreaterThan(450)
  })

  it('excludes loads outside the requested payout range', async () => {
    findDriverByIdMock.mockReturnValue(queryChain({}) as never)
    findTruckMock.mockReturnValue(queryChain([]) as never)
    findLoadMock.mockReturnValue(
      queryChain([
        {
          _id: 'cheap',
          auctionId: { currentPrice: 100 },
          route: { distanceKm: 10 },
          selectedTruckId: null,
        },
        {
          _id: 'expensive',
          auctionId: { currentPrice: 900 },
          route: { distanceKm: 10 },
          selectedTruckId: null,
        },
      ]) as never
    )

    const result = await getDriverRevenue(DRIVER_ID, { minPayout: '500' })

    expect(result.loadBreakdown).toHaveLength(1)
    expect(result.loadBreakdown[0]).toMatchObject({ payout: 900 })
  })

  it('uses the selected truck insurance instead of the fleet total when a truck is chosen', async () => {
    findDriverByIdMock.mockReturnValue(queryChain({}) as never)
    findTruckMock.mockReturnValue(
      queryChain([
        { _id: TRUCK_ID, expensePreferences: { insurancePerMonth: 300 } },
        { _id: 'other-truck', expensePreferences: { insurancePerMonth: 200 } },
      ]) as never
    )
    findLoadMock.mockReturnValue(
      queryChain([
        {
          _id: 'load-1',
          auctionId: { currentPrice: 500 },
          route: { distanceKm: 100 },
          selectedTruckId: { toString: () => TRUCK_ID },
        },
      ]) as never
    )

    const result = await getDriverRevenue(DRIVER_ID, {})

    expect(result.loadBreakdown[0]).toMatchObject({ effectiveInsurancePerMonth: 300 })
  })

  it('400s on an invalid selectedTruck filter', async () => {
    findDriverByIdMock.mockReturnValue(queryChain({}) as never)
    findTruckMock.mockReturnValue(queryChain([]) as never)

    await expect(getDriverRevenue(DRIVER_ID, { selectedTruck: INVALID_ID })).rejects.toMatchObject({
      statusCode: StatusCodes.BAD_REQUEST,
    })
  })
})

describe('updateDriverExpenses', () => {
  it('400s on an invalid driverId', async () => {
    await expect(updateDriverExpenses(INVALID_ID, { fuelCostPerLiter: 2 })).rejects.toMatchObject({
      statusCode: StatusCodes.BAD_REQUEST,
    })
  })

  it('400s when no allowed expense fields are present', async () => {
    await expect(updateDriverExpenses(DRIVER_ID, { notAllowed: 1 })).rejects.toMatchObject({
      statusCode: StatusCodes.BAD_REQUEST,
    })
  })

  it('404s when the driver does not exist', async () => {
    findDriverByIdMock.mockResolvedValue(null)

    await expect(updateDriverExpenses(DRIVER_ID, { fuelCostPerLiter: 2 })).rejects.toMatchObject({
      statusCode: StatusCodes.NOT_FOUND,
    })
  })

  it('sets the expense preferences and saves', async () => {
    const driverDoc = {
      expensePreferences: {},
      save: jest.fn().mockResolvedValue(undefined),
      toObject: jest.fn().mockReturnValue({ expensePreferences: { fuelCostPerLiter: 2 } }),
    }
    findDriverByIdMock.mockResolvedValue(driverDoc as never)

    const result = await updateDriverExpenses(DRIVER_ID, { fuelCostPerLiter: 2 })

    expect(driverDoc.expensePreferences).toEqual({ fuelCostPerLiter: 2 })
    expect(driverDoc.save).toHaveBeenCalled()
    expect(result).toEqual({ expensePreferences: { fuelCostPerLiter: 2 } })
  })
})
