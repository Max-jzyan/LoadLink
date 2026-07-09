import httpMocks from 'node-mocks-http'
import { StatusCodes } from 'http-status-codes'
import { ApiError } from '../../utils/ApiError'
import * as auctionService from '../../services/auctionService'
import { onBidsUpdate, onPriceUpdate } from '../../events/auctionEvents'
import {
  createAuction,
  placeBid,
  claimLoad,
  streamBids,
  streamPrice,
  acceptBid,
  updateAuction,
  cancelAuction,
  reopenAuction,
} from '../auctionController'
import type { AuthedUser } from '../../types/auth'

jest.mock('../../services/auctionService')
jest.mock('../../events/auctionEvents')

const createAuctionMock = jest.mocked(auctionService.createAuction)
const placeBidMock = jest.mocked(auctionService.placeBid)
const claimLoadMock = jest.mocked(auctionService.claimLoad)
const getBidsSnapshotMock = jest.mocked(auctionService.getBidsSnapshot)
const getPriceSnapshotMock = jest.mocked(auctionService.getPriceSnapshot)
const acceptBidMock = jest.mocked(auctionService.acceptBid)
const updateAuctionMock = jest.mocked(auctionService.updateAuction)
const cancelAuctionMock = jest.mocked(auctionService.cancelAuction)
const reopenAuctionMock = jest.mocked(auctionService.reopenAuction)
const onBidsUpdateMock = jest.mocked(onBidsUpdate)
const onPriceUpdateMock = jest.mocked(onPriceUpdate)

const LOAD_ID = '000000000000000000000101'
const BID_ID = '000000000000000000000201'

function driverUser(): AuthedUser {
  return { _id: '000000000000000000000011', role: 'driver', firebaseUid: 'uid-1', email: 'd@x.com' }
}

beforeEach(() => {
  jest.resetAllMocks()
})

describe('createAuction', () => {
  it('201s with the created auction', async () => {
    createAuctionMock.mockResolvedValue({ _id: 'auction-1' } as never)
    const req = httpMocks.createRequest({ params: { loadId: LOAD_ID }, body: { startPrice: 500 } })
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await createAuction(req, res, next)

    expect(res.statusCode).toBe(StatusCodes.CREATED)
    expect(res._getJSONData()).toEqual({ _id: 'auction-1' })
    expect(createAuctionMock).toHaveBeenCalledWith(LOAD_ID, { startPrice: 500 })
  })

  it('forwards thrown errors to next', async () => {
    createAuctionMock.mockRejectedValue(new ApiError(StatusCodes.CONFLICT, 'exists'))
    const req = httpMocks.createRequest({ params: { loadId: LOAD_ID }, body: {} })
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await createAuction(req, res, next)

    expect(next).toHaveBeenCalledWith(expect.any(ApiError))
  })
})

describe('placeBid', () => {
  it('201s with the created bid, using the authenticated driver id', async () => {
    placeBidMock.mockResolvedValue({ _id: 'bid-1' } as never)
    const req = httpMocks.createRequest({
      params: { loadId: LOAD_ID },
      body: { amount: 600 },
      user: driverUser(),
    } as never)
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await placeBid(req, res, next)

    expect(res.statusCode).toBe(StatusCodes.CREATED)
    expect(placeBidMock).toHaveBeenCalledWith(LOAD_ID, driverUser()._id, 600)
  })

  it('forwards thrown errors to next', async () => {
    placeBidMock.mockRejectedValue(new ApiError(StatusCodes.BAD_REQUEST, 'too low'))
    const req = httpMocks.createRequest({
      params: { loadId: LOAD_ID },
      body: { amount: 1 },
      user: driverUser(),
    } as never)
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await placeBid(req, res, next)

    expect(next).toHaveBeenCalledWith(expect.any(ApiError))
  })
})

describe('claimLoad', () => {
  it('200s with the claim result', async () => {
    claimLoadMock.mockResolvedValue({ finalPayout: 700 } as never)
    const req = httpMocks.createRequest({
      params: { loadId: LOAD_ID },
      user: driverUser(),
    } as never)
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await claimLoad(req, res, next)

    expect(res.statusCode).toBe(StatusCodes.OK)
    expect(res._getJSONData()).toEqual({ finalPayout: 700 })
  })
})

describe('acceptBid', () => {
  it('200s with the accept result', async () => {
    acceptBidMock.mockResolvedValue({ finalPayout: 640 } as never)
    const req = httpMocks.createRequest({ params: { loadId: LOAD_ID, bidId: BID_ID } })
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await acceptBid(req, res, next)

    expect(acceptBidMock).toHaveBeenCalledWith(LOAD_ID, BID_ID)
    expect(res.statusCode).toBe(StatusCodes.OK)
  })
})

describe('updateAuction', () => {
  it('200s with the update result', async () => {
    updateAuctionMock.mockResolvedValue({ loadId: LOAD_ID } as never)
    const req = httpMocks.createRequest({
      params: { loadId: LOAD_ID },
      body: { newPriceCeiling: 1200 },
    })
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await updateAuction(req, res, next)

    expect(updateAuctionMock).toHaveBeenCalledWith(LOAD_ID, { newPriceCeiling: 1200 })
    expect(res.statusCode).toBe(StatusCodes.OK)
  })
})

describe('cancelAuction', () => {
  it('204s with no body', async () => {
    cancelAuctionMock.mockResolvedValue(undefined)
    const req = httpMocks.createRequest({ params: { loadId: LOAD_ID } })
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await cancelAuction(req, res, next)

    expect(cancelAuctionMock).toHaveBeenCalledWith(LOAD_ID)
    expect(res.statusCode).toBe(StatusCodes.NO_CONTENT)
  })
})

describe('reopenAuction', () => {
  it('defaults extendByHours to 4 when omitted', async () => {
    reopenAuctionMock.mockResolvedValue({ loadId: LOAD_ID } as never)
    const req = httpMocks.createRequest({ params: { loadId: LOAD_ID }, body: {} })
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await reopenAuction(req, res, next)

    expect(reopenAuctionMock).toHaveBeenCalledWith(LOAD_ID, 4)
  })

  it('passes through an explicit extendByHours', async () => {
    reopenAuctionMock.mockResolvedValue({ loadId: LOAD_ID } as never)
    const req = httpMocks.createRequest({ params: { loadId: LOAD_ID }, body: { extendByHours: 2 } })
    const res = httpMocks.createResponse()
    const next = jest.fn()

    await reopenAuction(req, res, next)

    expect(reopenAuctionMock).toHaveBeenCalledWith(LOAD_ID, 2)
  })
})

describe('streamBids', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('sends an initial snapshot, subscribes to updates, and cleans up on close', async () => {
    getBidsSnapshotMock.mockResolvedValue({ loadId: LOAD_ID, bids: [] } as never)
    let capturedListener: ((payload: unknown) => void) | undefined
    const unsubscribe = jest.fn()
    onBidsUpdateMock.mockImplementation((_loadId, listener) => {
      capturedListener = listener
      return unsubscribe
    })

    const req = httpMocks.createRequest({ params: { loadId: LOAD_ID } })
    const res = httpMocks.createResponse()
    res.flushHeaders = jest.fn()
    const next = jest.fn()

    await streamBids(req, res, next)

    expect(res.getHeader('Content-Type')).toBe('text/event-stream')
    expect(res._getData()).toContain(JSON.stringify({ loadId: LOAD_ID, bids: [] }))

    capturedListener?.({ loadId: LOAD_ID, bids: [{ amount: 1 }] })
    expect(res._getData()).toContain('"amount":1')

    req.emit('close')
    expect(unsubscribe).toHaveBeenCalled()
  })

  it('forwards errors from the snapshot lookup to next', async () => {
    getBidsSnapshotMock.mockRejectedValue(new ApiError(StatusCodes.NOT_FOUND, 'no auction'))
    const req = httpMocks.createRequest({ params: { loadId: LOAD_ID } })
    const res = httpMocks.createResponse()
    res.flushHeaders = jest.fn()
    const next = jest.fn()

    await streamBids(req, res, next)

    expect(next).toHaveBeenCalledWith(expect.any(ApiError))
  })
})

describe('streamPrice', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('sends an initial snapshot, subscribes to updates, and cleans up on close', async () => {
    getPriceSnapshotMock.mockResolvedValue({ loadId: LOAD_ID, currentPrice: 500 } as never)
    let capturedListener: ((payload: unknown) => void) | undefined
    const unsubscribe = jest.fn()
    onPriceUpdateMock.mockImplementation((_loadId, listener) => {
      capturedListener = listener
      return unsubscribe
    })

    const req = httpMocks.createRequest({ params: { loadId: LOAD_ID } })
    const res = httpMocks.createResponse()
    res.flushHeaders = jest.fn()
    const next = jest.fn()

    await streamPrice(req, res, next)

    expect(res._getData()).toContain(JSON.stringify({ loadId: LOAD_ID, currentPrice: 500 }))

    capturedListener?.({ loadId: LOAD_ID, currentPrice: 550 })
    expect(res._getData()).toContain('"currentPrice":550')

    req.emit('close')
    expect(unsubscribe).toHaveBeenCalled()
  })
})
