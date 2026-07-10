import { StatusCodes } from 'http-status-codes'
import { ApiError } from '../../utils/ApiError'
import { AUCTION_STATUSES, BID_STATUSES, LOAD_STATUSES } from '../../models/enums'
import { AuctionModel } from '../../models/loads/Auction'
import { BidModel } from '../../models/loads/Bid'
import { LoadModel } from '../../models/loads/Load'
import { emitBidsUpdate, emitPriceUpdate } from '../../events/auctionEvents'
import { generateRateConfirmationPdf } from '../pdfService'
import {
  createAuction,
  placeBid,
  claimLoad,
  acceptBid,
  updateAuction,
  cancelAuction,
  reopenAuction,
  settleAuctionWithBid,
  getBidsSnapshot,
  getPriceSnapshot,
} from '../auctionService'

jest.mock('../../models/loads/Auction')
jest.mock('../../models/loads/Bid')
jest.mock('../../models/loads/Load')
jest.mock('../../events/auctionEvents')
jest.mock('../pdfService')
jest.mock('../notificationService')

const findAuctionOneMock = jest.mocked(AuctionModel.findOne)
const createAuctionMock = jest.mocked(AuctionModel.create)
const findBidByIdMock = jest.mocked(BidModel.findById)
const createBidMock = jest.mocked(BidModel.create)
const findBidMock = jest.mocked(BidModel.find)
const findBidOneMock = jest.mocked(BidModel.findOne)
const updateManyBidMock = jest.mocked(BidModel.updateMany)
const findLoadByIdAndUpdateMock = jest.mocked(LoadModel.findByIdAndUpdate)
const findLoadByIdMock = jest.mocked(LoadModel.findById)
const emitBidsUpdateMock = jest.mocked(emitBidsUpdate)
const emitPriceUpdateMock = jest.mocked(emitPriceUpdate)
const generatePdfMock = jest.mocked(generateRateConfirmationPdf)

const LOAD_ID = '000000000000000000000101'
const DRIVER_ID = '000000000000000000000011'
const COMPANY_ID = '000000000000000000000001'
const BID_ID = '000000000000000000000201'
const TRUCK_ID = '000000000000000000000401'
const INVALID_ID = 'not-an-object-id'

function fakeAuction(overrides: Record<string, unknown> = {}) {
  return {
    _id: { toString: () => 'auction-1' },
    loadId: { toString: () => LOAD_ID },
    companyId: COMPANY_ID,
    startPrice: 500,
    capPrice: 1000,
    currentPrice: 500,
    priceCreepAmount: 50,
    priceCreepIntervalHours: 1,
    autoAcceptPercent: 0,
    autoAcceptTriggerHours: 0,
    currency: 'CAD',
    expiresAt: new Date(Date.now() + MS_PER_HOUR),
    status: AUCTION_STATUSES.Active,
    claimedByDriverId: null,
    autoAcceptedBidId: null,
    lastPriceUpdateAt: new Date(0),
    bestBidAmount: null,
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

function fakeBid(overrides: Record<string, unknown> = {}) {
  return {
    _id: { toString: () => BID_ID },
    loadId: LOAD_ID,
    auctionId: 'auction-1',
    driverId: DRIVER_ID,
    amount: 600,
    status: BID_STATUSES.Submitted,
    acceptedAt: null,
    save: jest.fn().mockResolvedValue(undefined),
    populate: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

const MS_PER_HOUR = 3_600_000

/** Makes emitBidsAndPrice (called at the end of most mutations) a no-op by
 * having its internal AuctionModel.findOne lookup resolve to null. */
function stubEmit() {
  findBidMock.mockReturnValue({
    sort: jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue([]) }),
  } as never)
}

beforeEach(() => {
  jest.resetAllMocks()
  stubEmit()
  findLoadByIdMock.mockReturnValue({
    populate: jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(undefined) }),
    }),
  } as never)
})

describe('createAuction', () => {
  it('400s on an invalid loadId', async () => {
    await expect(createAuction(INVALID_ID, {} as never)).rejects.toMatchObject({
      statusCode: StatusCodes.BAD_REQUEST,
    })
  })

  it('404s when the load does not exist', async () => {
    findLoadByIdMock.mockResolvedValue(null)

    await expect(
      createAuction(LOAD_ID, { startPrice: 500, capPrice: 1000, priceCreepAmount: 50 })
    ).rejects.toMatchObject({ statusCode: StatusCodes.NOT_FOUND })
  })

  it('409s when an auction already exists for the load', async () => {
    findLoadByIdMock.mockResolvedValue({ _id: LOAD_ID, dropoffTime: new Date() } as never)
    findAuctionOneMock.mockResolvedValue(fakeAuction() as never)

    await expect(
      createAuction(LOAD_ID, { startPrice: 500, capPrice: 1000, priceCreepAmount: 50 })
    ).rejects.toMatchObject({ statusCode: StatusCodes.CONFLICT })
  })

  it('400s when capPrice is below startPrice', async () => {
    findLoadByIdMock.mockResolvedValue({ _id: LOAD_ID, dropoffTime: new Date() } as never)
    findAuctionOneMock.mockResolvedValue(null)

    await expect(
      createAuction(LOAD_ID, { startPrice: 1000, capPrice: 500, priceCreepAmount: 50 })
    ).rejects.toMatchObject({ statusCode: StatusCodes.BAD_REQUEST })
  })

  it('400s when priceCreepAmount is not positive', async () => {
    findLoadByIdMock.mockResolvedValue({ _id: LOAD_ID, dropoffTime: new Date() } as never)
    findAuctionOneMock.mockResolvedValue(null)

    await expect(
      createAuction(LOAD_ID, { startPrice: 500, capPrice: 1000, priceCreepAmount: 0 })
    ).rejects.toMatchObject({ statusCode: StatusCodes.BAD_REQUEST })
  })

  it('creates the auction and books the load into auction_live', async () => {
    const dropoffTime = new Date('2026-01-10T12:00:00Z')
    findLoadByIdMock.mockResolvedValue({
      _id: LOAD_ID,
      companyId: COMPANY_ID,
      dropoffTime,
    } as never)
    findAuctionOneMock.mockResolvedValue(null)
    createAuctionMock.mockResolvedValue(fakeAuction() as never)

    await createAuction(LOAD_ID, {
      startPrice: 500,
      capPrice: 1000,
      priceCreepAmount: 50,
      hoursBeforeDropoff: 2,
    })

    expect(createAuctionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        loadId: LOAD_ID,
        companyId: COMPANY_ID,
        startPrice: 500,
        capPrice: 1000,
        currentPrice: 500,
        expiresAt: new Date(dropoffTime.getTime() - 2 * MS_PER_HOUR),
        status: AUCTION_STATUSES.Active,
      })
    )
    expect(findLoadByIdAndUpdateMock).toHaveBeenCalledWith(
      LOAD_ID,
      expect.objectContaining({ status: LOAD_STATUSES.AuctionLive })
    )
  })

  it('defaults expiresAt to the dropoff time when hoursBeforeDropoff is omitted', async () => {
    const dropoffTime = new Date('2026-01-10T12:00:00Z')
    findLoadByIdMock.mockResolvedValue({ _id: LOAD_ID, dropoffTime } as never)
    findAuctionOneMock.mockResolvedValue(null)
    createAuctionMock.mockResolvedValue(fakeAuction() as never)

    await createAuction(LOAD_ID, { startPrice: 500, capPrice: 1000, priceCreepAmount: 50 })

    expect(createAuctionMock).toHaveBeenCalledWith(
      expect.objectContaining({ expiresAt: dropoffTime })
    )
  })
})

describe('placeBid', () => {
  it('400s on an invalid loadId/driverId/selectedTruckId', async () => {
    await expect(placeBid(INVALID_ID, DRIVER_ID, 600)).rejects.toMatchObject({
      statusCode: StatusCodes.BAD_REQUEST,
    })
    await expect(placeBid(LOAD_ID, INVALID_ID, 600)).rejects.toMatchObject({
      statusCode: StatusCodes.BAD_REQUEST,
    })
    await expect(placeBid(LOAD_ID, DRIVER_ID, 600, INVALID_ID)).rejects.toMatchObject({
      statusCode: StatusCodes.BAD_REQUEST,
    })
  })

  it('400s when the amount is not a positive number', async () => {
    await expect(placeBid(LOAD_ID, DRIVER_ID, 0)).rejects.toMatchObject({
      statusCode: StatusCodes.BAD_REQUEST,
    })
  })

  it('404s when there is no auction for the load', async () => {
    findAuctionOneMock.mockResolvedValue(null)

    await expect(placeBid(LOAD_ID, DRIVER_ID, 600)).rejects.toMatchObject({
      statusCode: StatusCodes.NOT_FOUND,
    })
  })

  it('409s when the auction is not live', async () => {
    findAuctionOneMock.mockResolvedValue(fakeAuction({ status: AUCTION_STATUSES.Closed }) as never)

    await expect(placeBid(LOAD_ID, DRIVER_ID, 600)).rejects.toMatchObject({
      statusCode: StatusCodes.CONFLICT,
    })
  })

  it('400s when the bid is below the current price', async () => {
    findAuctionOneMock.mockResolvedValue(fakeAuction({ currentPrice: 700 }) as never)

    await expect(placeBid(LOAD_ID, DRIVER_ID, 600)).rejects.toMatchObject({
      statusCode: StatusCodes.BAD_REQUEST,
    })
  })

  it('creates the bid and updates bestBidAmount when this bid is the new lowest', async () => {
    const auction = fakeAuction({ currentPrice: 500, bestBidAmount: null })
    findAuctionOneMock.mockResolvedValue(auction as never)
    const bid = fakeBid({ amount: 600 })
    createBidMock.mockResolvedValue(bid as never)

    await placeBid(LOAD_ID, DRIVER_ID, 600)

    expect(createBidMock).toHaveBeenCalledWith(
      expect.objectContaining({ loadId: LOAD_ID, driverId: DRIVER_ID, amount: 600 })
    )
    expect(auction.bestBidAmount).toBe(600)
    expect(auction.save).toHaveBeenCalled()
    expect(bid.populate).toHaveBeenCalledWith('driverId')
  })

  it('does not touch bestBidAmount when the new bid is not an improvement', async () => {
    const auction = fakeAuction({ currentPrice: 500, bestBidAmount: 550 })
    findAuctionOneMock.mockResolvedValue(auction as never)
    createBidMock.mockResolvedValue(fakeBid({ amount: 600 }) as never)

    await placeBid(LOAD_ID, DRIVER_ID, 600)

    expect(auction.bestBidAmount).toBe(550)
    expect(auction.save).not.toHaveBeenCalled()
  })

  it('associates the selected truck with the load when provided', async () => {
    findAuctionOneMock.mockResolvedValue(fakeAuction() as never)
    createBidMock.mockResolvedValue(fakeBid() as never)

    await placeBid(LOAD_ID, DRIVER_ID, 600, TRUCK_ID)

    expect(findLoadByIdAndUpdateMock).toHaveBeenCalledWith(LOAD_ID, {
      selectedTruckId: TRUCK_ID,
    })
  })
})

describe('claimLoad', () => {
  it('404s when there is no auction for the load', async () => {
    findAuctionOneMock.mockResolvedValue(null)

    await expect(claimLoad(LOAD_ID, DRIVER_ID)).rejects.toMatchObject({
      statusCode: StatusCodes.NOT_FOUND,
    })
  })

  it('409s when the auction is not live', async () => {
    findAuctionOneMock.mockResolvedValue(fakeAuction({ status: AUCTION_STATUSES.Closed }) as never)

    await expect(claimLoad(LOAD_ID, DRIVER_ID)).rejects.toMatchObject({
      statusCode: StatusCodes.CONFLICT,
    })
  })

  it('books the load at the current price and closes the auction', async () => {
    const auction = fakeAuction({ currentPrice: 750 })
    findAuctionOneMock.mockResolvedValue(auction as never)
    createBidMock.mockResolvedValue(fakeBid({ amount: 750 }) as never)

    const result = await claimLoad(LOAD_ID, DRIVER_ID, TRUCK_ID)

    expect(auction.status).toBe(AUCTION_STATUSES.Closed)
    expect(auction.claimedByDriverId).toBe(DRIVER_ID)
    expect(findLoadByIdAndUpdateMock).toHaveBeenCalledWith(
      LOAD_ID,
      expect.objectContaining({
        status: LOAD_STATUSES.Booked,
        assignedDriverId: DRIVER_ID,
        selectedTruckId: TRUCK_ID,
      })
    )
    expect(result.finalPayout).toBe(750)
  })
})

describe('acceptBid', () => {
  it('404s when there is no auction for the load', async () => {
    findAuctionOneMock.mockResolvedValue(null)

    await expect(acceptBid(LOAD_ID, BID_ID)).rejects.toMatchObject({
      statusCode: StatusCodes.NOT_FOUND,
    })
  })

  it('409s when the auction is not live', async () => {
    findAuctionOneMock.mockResolvedValue(
      fakeAuction({ status: AUCTION_STATUSES.Cancelled }) as never
    )

    await expect(acceptBid(LOAD_ID, BID_ID)).rejects.toMatchObject({
      statusCode: StatusCodes.CONFLICT,
    })
  })

  it('404s when the bid does not belong to this load', async () => {
    findAuctionOneMock.mockResolvedValue(fakeAuction() as never)
    findBidByIdMock.mockResolvedValue(fakeBid({ loadId: '000000000000000000000999' }) as never)

    await expect(acceptBid(LOAD_ID, BID_ID)).rejects.toMatchObject({
      statusCode: StatusCodes.NOT_FOUND,
    })
  })

  it('settles the auction with the bid and returns a rate confirmation url', async () => {
    const auction = fakeAuction()
    findAuctionOneMock.mockResolvedValue(auction as never)
    const bid = fakeBid({ amount: 640 })
    findBidByIdMock.mockResolvedValue(bid as never)

    // Mock load lookup for PDF generation
    findLoadByIdMock.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({
            companyId: { companyName: 'Test Co', businessAddress: '123 St' },
            assignedDriverId: { name: 'Test Driver', email: 'driver@test.com' },
            originAddress: 'Origin',
            destinationAddress: 'Dest',
            pickupTime: new Date(),
            dropoffTime: new Date(),
            commodity: 'Goods',
            weightLbs: 1000,
            truckType: 'Flatbed',
          }),
        }),
      }),
    } as never)

    // Mock PDF generation to return URL containing BID_ID
    generatePdfMock.mockResolvedValue({
      url: `https://s3.example.com/rate-confirmations/${BID_ID}.pdf`,
      key: 'rate-confirmations/test-key.pdf',
    })

    const result = await acceptBid(LOAD_ID, BID_ID)

    expect(bid.status).toBe(BID_STATUSES.Accepted)
    expect(auction.status).toBe(AUCTION_STATUSES.Closed)
    expect(result.finalPayout).toBe(640)
    expect(result.rateConfirmationUrl).toContain(BID_ID)
  })
})

describe('settleAuctionWithBid', () => {
  it('accepts the bid, closes the auction, and books the load', async () => {
    const auction = fakeAuction()
    const bid = fakeBid()

    await settleAuctionWithBid(auction as never, bid as never)

    expect(bid.status).toBe(BID_STATUSES.Accepted)
    expect(bid.acceptedAt).toBeInstanceOf(Date)
    expect(auction.status).toBe(AUCTION_STATUSES.Closed)
    expect(auction.claimedByDriverId).toBe(bid.driverId)
    expect(auction.autoAcceptedBidId).toBe(bid._id)
    expect(findLoadByIdAndUpdateMock).toHaveBeenCalledWith(auction.loadId, {
      status: LOAD_STATUSES.Booked,
      assignedDriverId: bid.driverId,
    })
  })
})

describe('updateAuction', () => {
  it('404s when there is no auction for the load', async () => {
    findAuctionOneMock.mockResolvedValue(null)

    await expect(updateAuction(LOAD_ID, {})).rejects.toMatchObject({
      statusCode: StatusCodes.NOT_FOUND,
    })
  })

  it('409s when the auction is not live', async () => {
    findAuctionOneMock.mockResolvedValue(fakeAuction({ status: AUCTION_STATUSES.Closed }) as never)

    await expect(updateAuction(LOAD_ID, {})).rejects.toMatchObject({
      statusCode: StatusCodes.CONFLICT,
    })
  })

  it('applies deadline extension, cap price, and auto-accept tolerance changes', async () => {
    const expiresAt = new Date('2026-01-01T00:00:00Z')
    const auction = fakeAuction({ expiresAt, capPrice: 1000, autoAcceptPercent: 0 })
    findAuctionOneMock.mockResolvedValue(auction as never)

    const result = await updateAuction(LOAD_ID, {
      extendByMinutes: 30,
      newPriceCeiling: 1200,
      autoAcceptTolerancePercentage: 10,
    })

    expect(auction.expiresAt).toEqual(new Date(expiresAt.getTime() + 30 * 60_000))
    expect(auction.capPrice).toBe(1200)
    expect(auction.autoAcceptPercent).toBe(10)
    expect(result.autoAcceptToleranceThreshold).toBe(1320)
  })
})

describe('cancelAuction', () => {
  it('404s when there is no auction for the load', async () => {
    findAuctionOneMock.mockResolvedValue(null)

    await expect(cancelAuction(LOAD_ID)).rejects.toMatchObject({
      statusCode: StatusCodes.NOT_FOUND,
    })
  })

  it('cancels the auction and the load', async () => {
    const auction = fakeAuction()
    findAuctionOneMock.mockResolvedValue(auction as never)

    await cancelAuction(LOAD_ID)

    expect(auction.status).toBe(AUCTION_STATUSES.Cancelled)
    expect(findLoadByIdAndUpdateMock).toHaveBeenCalledWith(LOAD_ID, {
      status: LOAD_STATUSES.Cancelled,
    })
  })
})

describe('reopenAuction', () => {
  it('400s when the extension is not a positive number', async () => {
    await expect(reopenAuction(LOAD_ID, 0)).rejects.toMatchObject({
      statusCode: StatusCodes.BAD_REQUEST,
    })
    await expect(reopenAuction(LOAD_ID, NaN)).rejects.toMatchObject({
      statusCode: StatusCodes.BAD_REQUEST,
    })
  })

  it('404s when there is no auction for the load', async () => {
    findAuctionOneMock.mockResolvedValue(null)

    await expect(reopenAuction(LOAD_ID, 1)).rejects.toMatchObject({
      statusCode: StatusCodes.NOT_FOUND,
    })
  })

  it('409s when the auction is cancelled', async () => {
    findAuctionOneMock.mockResolvedValue(
      fakeAuction({ status: AUCTION_STATUSES.Cancelled }) as never
    )

    await expect(reopenAuction(LOAD_ID, 1)).rejects.toMatchObject({
      statusCode: StatusCodes.CONFLICT,
    })
  })

  it('409s when the auction is already live', async () => {
    findAuctionOneMock.mockResolvedValue(fakeAuction({ status: AUCTION_STATUSES.Active }) as never)

    await expect(reopenAuction(LOAD_ID, 1)).rejects.toMatchObject({
      statusCode: StatusCodes.CONFLICT,
    })
  })

  it('resets accepted bids, recomputes bestBidAmount, and reopens the auction', async () => {
    const auction = fakeAuction({
      status: AUCTION_STATUSES.Closed,
      claimedByDriverId: DRIVER_ID,
      autoAcceptedBidId: BID_ID,
    })
    findAuctionOneMock.mockResolvedValue(auction as never)
    findBidOneMock.mockReturnValueOnce({
      sort: jest.fn().mockResolvedValue({ amount: 620 }),
    } as never)

    const before = Date.now()
    const result = await reopenAuction(LOAD_ID, 2)

    expect(updateManyBidMock).toHaveBeenCalledWith(
      { loadId: LOAD_ID, status: BID_STATUSES.Accepted },
      { $set: { status: BID_STATUSES.Submitted, acceptedAt: null } }
    )
    expect(auction.status).toBe(AUCTION_STATUSES.Active)
    expect(auction.claimedByDriverId).toBeNull()
    expect(auction.autoAcceptedBidId).toBeNull()
    expect(auction.bestBidAmount).toBe(620)
    expect(auction.expiresAt.getTime()).toBeGreaterThanOrEqual(before + 2 * MS_PER_HOUR)
    expect(findLoadByIdAndUpdateMock).toHaveBeenCalledWith(LOAD_ID, {
      status: LOAD_STATUSES.AuctionLive,
      assignedDriverId: null,
    })
    expect(result.loadId).toBe(LOAD_ID)
  })
})

describe('getBidsSnapshot / getPriceSnapshot', () => {
  it('400s on an invalid loadId', async () => {
    await expect(getBidsSnapshot(INVALID_ID)).rejects.toMatchObject({
      statusCode: StatusCodes.BAD_REQUEST,
    })
    await expect(getPriceSnapshot(INVALID_ID)).rejects.toMatchObject({
      statusCode: StatusCodes.BAD_REQUEST,
    })
  })

  it('404s when there is no auction for the load', async () => {
    findAuctionOneMock.mockResolvedValue(null)

    await expect(getBidsSnapshot(LOAD_ID)).rejects.toMatchObject({
      statusCode: StatusCodes.NOT_FOUND,
    })
    await expect(getPriceSnapshot(LOAD_ID)).rejects.toMatchObject({
      statusCode: StatusCodes.NOT_FOUND,
    })
  })

  it('returns the bids and price snapshots for a live auction', async () => {
    const auction = fakeAuction({ currentPrice: 555 })
    findAuctionOneMock.mockResolvedValue(auction as never)
    findBidMock.mockReturnValue({
      sort: jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue([fakeBid()]) }),
    } as never)

    const bids = await getBidsSnapshot(LOAD_ID)
    const price = await getPriceSnapshot(LOAD_ID)

    expect(bids.loadId).toBe(LOAD_ID)
    expect(bids.bids).toHaveLength(1)
    expect(price.currentPrice).toBe(555)
  })
})

describe('emit side effects', () => {
  it('placeBid pushes bids and price updates for open streams', async () => {
    findAuctionOneMock.mockResolvedValue(fakeAuction() as never)
    createBidMock.mockResolvedValue(fakeBid() as never)
    findBidMock.mockReturnValue({
      sort: jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue([fakeBid()]) }),
    } as never)

    await placeBid(LOAD_ID, DRIVER_ID, 600)

    expect(emitBidsUpdateMock).toHaveBeenCalledWith(LOAD_ID, expect.any(Object))
    expect(emitPriceUpdateMock).toHaveBeenCalledWith(LOAD_ID, expect.any(Object))
  })
})
