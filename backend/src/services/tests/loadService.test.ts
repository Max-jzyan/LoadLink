import { StatusCodes } from 'http-status-codes'
import { LoadModel } from '../../models/loads/Load'
import { AuctionModel } from '../../models/loads/Auction'
import { ReviewModel } from '../../models/ratings/Review'
import { TruckModel } from '../../models/trucks/Truck'
import { LOAD_STATUSES } from '../../models/enums'
import { computeRoute } from '../../lib/routing'
import { emitLoadPosted } from '../../events/auctionEvents'
import {
  getLoad,
  createLoad,
  updateLoad,
  listCompanyLoads,
  listAvailableLoads,
  selectTruckForLoad,
} from '../loadService'

jest.mock('../../models/loads/Load')
jest.mock('../../models/loads/Auction')
jest.mock('../../models/ratings/Review')
jest.mock('../../models/trucks/Truck', () => ({ TruckModel: { findOne: jest.fn() } }))
jest.mock('../../lib/routing')
jest.mock('../../events/auctionEvents')

const findLoadByIdMock = jest.mocked(LoadModel.findById)
const createLoadMock = jest.mocked(LoadModel.create)
const findLoadByIdAndUpdateMock = jest.mocked(LoadModel.findByIdAndUpdate)
const findLoadMock = jest.mocked(LoadModel.find)
const createAuctionMock = jest.mocked(AuctionModel.create)
const distinctReviewMock = jest.mocked(ReviewModel.distinct)
const findTruckOneMock = jest.mocked(TruckModel.findOne)
const computeRouteMock = jest.mocked(computeRoute)
const emitLoadPostedMock = jest.mocked(emitLoadPosted)

const LOAD_ID = '000000000000000000000101'
const DRIVER_ID = '000000000000000000000011'
const COMPANY_ID = '000000000000000000000001'
const TRUCK_ID = '000000000000000000000401'
const INVALID_ID = 'not-an-object-id'

function chain(result: unknown) {
  const thenable: never = {
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    then: (resolve: (v: unknown) => void) => resolve(result),
  } as never
  return thenable
}

function fakeLoad(overrides: Record<string, unknown> = {}): Record<string, any> {
  return {
    _id: { toString: () => LOAD_ID },
    companyId: { toString: () => COMPANY_ID },
    assignedDriverId: { toString: () => DRIVER_ID },
    selectedTruckId: null,
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

beforeEach(() => {
  jest.resetAllMocks()
})

describe('getLoad', () => {
  it('404s when the load does not exist', async () => {
    findLoadByIdMock.mockReturnValue(chain(null))

    await expect(getLoad(LOAD_ID)).rejects.toMatchObject({ statusCode: StatusCodes.NOT_FOUND })
  })

  it('returns the populated load when found', async () => {
    const load = fakeLoad()
    findLoadByIdMock.mockReturnValue(chain(load))

    await expect(getLoad(LOAD_ID)).resolves.toBe(load)
  })
})

describe('createLoad', () => {
  it('creates the load, persists the computed route, creates the auction, and emits', async () => {
    const load = fakeLoad({ route: undefined })
    createLoadMock.mockResolvedValue(load as never)
    computeRouteMock.mockResolvedValue({ polyline: 'abc', distanceKm: 100, durationHours: 2 })
    createAuctionMock.mockResolvedValue({ _id: 'auction-1' } as never)

    await createLoad(COMPANY_ID, {
      startPrice: 500,
      capPrice: 1000,
      priceCreepAmount: 50,
      originCoords: { lat: 1, lng: 2 },
      destinationCoords: { lat: 3, lng: 4 },
    })

    expect(createLoadMock).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: COMPANY_ID,
        createdBy: COMPANY_ID,
        status: LOAD_STATUSES.AuctionLive,
      })
    )
    expect(load.route).toEqual({ polyline: 'abc', distanceKm: 100, durationHours: 2 })
    expect(createAuctionMock).toHaveBeenCalledWith(
      expect.objectContaining({ loadId: load._id, companyId: COMPANY_ID, currentPrice: 500 })
    )
    expect(load.auctionId).toBe('auction-1')
    expect(emitLoadPostedMock).toHaveBeenCalledWith({ loadId: LOAD_ID, companyId: COMPANY_ID })
  })

  it('tolerates a failed route computation', async () => {
    const load = fakeLoad()
    createLoadMock.mockResolvedValue(load as never)
    computeRouteMock.mockResolvedValue(null)
    createAuctionMock.mockResolvedValue({ _id: 'auction-1' } as never)

    await createLoad(COMPANY_ID, {
      startPrice: 500,
      capPrice: 1000,
      priceCreepAmount: 50,
      originCoords: { lat: 1, lng: 2 },
      destinationCoords: { lat: 3, lng: 4 },
    })

    expect(load.route).toBeUndefined()
  })
})

describe('updateLoad', () => {
  it('404s when the load does not exist', async () => {
    findLoadByIdAndUpdateMock.mockResolvedValue(null)

    await expect(updateLoad(LOAD_ID, { notes: 'x' })).rejects.toMatchObject({
      statusCode: StatusCodes.NOT_FOUND,
    })
  })

  it('updates and returns the load', async () => {
    const load = fakeLoad()
    findLoadByIdAndUpdateMock.mockResolvedValue(load as never)

    await expect(updateLoad(LOAD_ID, { notes: 'x' })).resolves.toBe(load)
    expect(findLoadByIdAndUpdateMock).toHaveBeenCalledWith(
      LOAD_ID,
      { notes: 'x' },
      { new: true, runValidators: true }
    )
  })
})

describe('listCompanyLoads', () => {
  it('filters by companyId alone by default', async () => {
    findLoadMock.mockReturnValue(chain([]))

    await listCompanyLoads(COMPANY_ID)

    expect(findLoadMock).toHaveBeenCalledWith({ companyId: COMPANY_ID })
  })

  it('excludes loads already reviewed by the caller', async () => {
    distinctReviewMock.mockResolvedValue(['load-a', 'load-b'])
    findLoadMock.mockReturnValue(chain([]))

    await listCompanyLoads(COMPANY_ID, { excludeReviewedBy: COMPANY_ID })

    expect(distinctReviewMock).toHaveBeenCalledWith('loadId', { reviewerId: COMPANY_ID })
    expect(findLoadMock).toHaveBeenCalledWith({
      companyId: COMPANY_ID,
      _id: { $nin: ['load-a', 'load-b'] },
    })
  })
})

describe('listAvailableLoads', () => {
  it('defaults to auction_live loads', async () => {
    findLoadMock.mockReturnValue(chain([]))

    await listAvailableLoads()

    expect(findLoadMock).toHaveBeenCalledWith({ status: LOAD_STATUSES.AuctionLive })
  })

  it('honors an explicit status filter', async () => {
    findLoadMock.mockReturnValue(chain([]))

    await listAvailableLoads(LOAD_STATUSES.Booked)

    expect(findLoadMock).toHaveBeenCalledWith({ status: LOAD_STATUSES.Booked })
  })
})

describe('selectTruckForLoad', () => {
  it('400s on invalid ids', async () => {
    await expect(selectTruckForLoad(INVALID_ID, DRIVER_ID, null)).rejects.toMatchObject({
      statusCode: StatusCodes.BAD_REQUEST,
    })
    await expect(selectTruckForLoad(LOAD_ID, INVALID_ID, null)).rejects.toMatchObject({
      statusCode: StatusCodes.BAD_REQUEST,
    })
    await expect(selectTruckForLoad(LOAD_ID, DRIVER_ID, INVALID_ID)).rejects.toMatchObject({
      statusCode: StatusCodes.BAD_REQUEST,
    })
  })

  it('404s when the load does not exist', async () => {
    findLoadByIdMock.mockResolvedValue(null)

    await expect(selectTruckForLoad(LOAD_ID, DRIVER_ID, null)).rejects.toMatchObject({
      statusCode: StatusCodes.NOT_FOUND,
    })
  })

  it('403s when the caller is not the assigned driver', async () => {
    findLoadByIdMock.mockResolvedValue(
      fakeLoad({ assignedDriverId: { toString: () => 'someone-else' } }) as never
    )

    await expect(selectTruckForLoad(LOAD_ID, DRIVER_ID, null)).rejects.toMatchObject({
      statusCode: StatusCodes.FORBIDDEN,
    })
  })

  it('403s when the load has no assigned driver at all', async () => {
    findLoadByIdMock.mockResolvedValue(fakeLoad({ assignedDriverId: null }) as never)

    await expect(selectTruckForLoad(LOAD_ID, DRIVER_ID, null)).rejects.toMatchObject({
      statusCode: StatusCodes.FORBIDDEN,
    })
  })

  it('404s when the supplied truck does not belong to the driver', async () => {
    findLoadByIdMock.mockResolvedValue(fakeLoad() as never)
    findTruckOneMock.mockResolvedValue(null)

    await expect(selectTruckForLoad(LOAD_ID, DRIVER_ID, TRUCK_ID)).rejects.toMatchObject({
      statusCode: StatusCodes.NOT_FOUND,
    })
  })

  it('clears the truck when truckId is null', async () => {
    const load = fakeLoad({ selectedTruckId: { toString: () => TRUCK_ID } })
    findLoadByIdMock.mockResolvedValue(load as never)

    await selectTruckForLoad(LOAD_ID, DRIVER_ID, null)

    expect(load.selectedTruckId).toBeNull()
    expect(load.save).toHaveBeenCalled()
  })

  it('sets the truck once ownership is verified', async () => {
    const load = fakeLoad()
    findLoadByIdMock.mockResolvedValue(load as never)
    findTruckOneMock.mockResolvedValue({ _id: TRUCK_ID } as never)

    await selectTruckForLoad(LOAD_ID, DRIVER_ID, TRUCK_ID)

    expect(load.selectedTruckId?.toString()).toBe(TRUCK_ID)
    expect(load.save).toHaveBeenCalled()
  })
})
