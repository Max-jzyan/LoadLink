import { AuctionModel } from '../../models/loads/Auction'
import { BidModel } from '../../models/loads/Bid'
import { LoadModel } from '../../models/loads/Load'
import { AUCTION_STATUSES, BID_STATUSES, LOAD_STATUSES } from '../../models/enums'

const settleAuctionWithBidMock = jest.fn().mockResolvedValue(undefined)
const emitBidsAndPriceMock = jest.fn().mockResolvedValue(undefined)

jest.mock('../../models/loads/Auction')
jest.mock('../../models/loads/Bid')
jest.mock('../../models/loads/Load')
jest.mock('../auctionService', () => ({
  emitBidsAndPrice: (...args: unknown[]) => emitBidsAndPriceMock(...args),
  settleAuctionWithBid: (...args: unknown[]) => settleAuctionWithBidMock(...args),
}))

// Imported after the mocks so `tick` picks up the mocked module bindings.
import { startHeartbeat } from '../heartbeatService'

const findActiveAuctionsMock = jest.mocked(AuctionModel.find)
const findBidOneMock = jest.mocked(BidModel.findOne)
const findLoadByIdAndUpdateMock = jest.mocked(LoadModel.findByIdAndUpdate)

const MS_PER_HOUR = 3_600_000
const LOAD_ID = '000000000000000000000101'

function fakeAuction(overrides: Record<string, unknown> = {}) {
  return {
    loadId: { toString: () => LOAD_ID },
    startPrice: 500,
    capPrice: 1000,
    currentPrice: 500,
    priceCreepAmount: 50,
    priceCreepIntervalHours: 1,
    autoAcceptPercent: 0,
    autoAcceptTriggerHours: 0,
    expiresAt: new Date(Date.now() + MS_PER_HOUR),
    status: AUCTION_STATUSES.Active,
    lastPriceUpdateAt: new Date(0),
    bestBidAmount: null,
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

function fakeBid(amount: number) {
  return { amount, status: BID_STATUSES.Submitted }
}

/** Runs a single heartbeat tick by invoking startHeartbeat and waiting for its boot tick. */
async function runTick(): Promise<void> {
  jest.useFakeTimers()
  const stop = startHeartbeat()
  await jest.runOnlyPendingTimersAsync()
  stop()
  jest.useRealTimers()
}

beforeEach(() => {
  jest.resetAllMocks()
  jest.spyOn(console, 'log').mockImplementation(() => undefined)
  jest.spyOn(console, 'error').mockImplementation(() => undefined)
  findBidOneMock.mockReturnValue({ sort: jest.fn().mockResolvedValue(null) } as never)
})

afterEach(() => {
  jest.useRealTimers()
  jest.restoreAllMocks()
})

describe('tick', () => {
  it('does nothing when there are no active auctions', async () => {
    findActiveAuctionsMock.mockResolvedValue([])

    await runTick()

    expect(settleAuctionWithBidMock).not.toHaveBeenCalled()
    expect(emitBidsAndPriceMock).not.toHaveBeenCalled()
  })

  it('one auction throwing does not stop the others from being processed', async () => {
    const broken = fakeAuction({
      loadId: { toString: () => 'broken-load' },
      expiresAt: new Date(Date.now() - 1000),
      save: jest.fn().mockRejectedValue(new Error('boom')),
    })
    const healthy = fakeAuction({ currentPrice: 990, capPrice: 1000, priceCreepAmount: 50 })
    findActiveAuctionsMock.mockResolvedValue([broken, healthy] as never)

    await runTick()

    expect(healthy.save).toHaveBeenCalled()
  })
})

describe('processAuction: expiry', () => {
  it('closes the auction without a winner when expired with no eligible bid', async () => {
    const auction = fakeAuction({ expiresAt: new Date(Date.now() - 1000), bestBidAmount: null })
    findActiveAuctionsMock.mockResolvedValue([auction] as never)

    await runTick()

    expect(auction.status).toBe(AUCTION_STATUSES.Closed)
    expect(auction.save).toHaveBeenCalled()
    expect(findLoadByIdAndUpdateMock).toHaveBeenCalledWith(LOAD_ID, {
      status: LOAD_STATUSES.AuctionClosed,
    })
    expect(settleAuctionWithBidMock).not.toHaveBeenCalled()
    expect(emitBidsAndPriceMock).toHaveBeenCalledWith(LOAD_ID)
  })

  it('auto-accepts the best bid on expiry when one is within tolerance', async () => {
    const auction = fakeAuction({
      expiresAt: new Date(Date.now() - 1000),
      bestBidAmount: 600,
      capPrice: 1000,
      autoAcceptPercent: 0,
    })
    findActiveAuctionsMock.mockResolvedValue([auction] as never)
    findBidOneMock.mockReturnValue({ sort: jest.fn().mockResolvedValue(fakeBid(600)) } as never)

    await runTick()

    expect(settleAuctionWithBidMock).toHaveBeenCalledWith(
      auction,
      expect.objectContaining({ amount: 600 })
    )
    expect(auction.status).not.toBe(AUCTION_STATUSES.Closed)
    expect(findLoadByIdAndUpdateMock).not.toHaveBeenCalled()
  })

  it('closes without a winner on expiry when the lowest bid is above the tolerance ceiling', async () => {
    const auction = fakeAuction({
      expiresAt: new Date(Date.now() - 1000),
      bestBidAmount: 2000,
      capPrice: 1000,
      autoAcceptPercent: 0,
    })
    findActiveAuctionsMock.mockResolvedValue([auction] as never)
    findBidOneMock.mockReturnValue({ sort: jest.fn().mockResolvedValue(fakeBid(2000)) } as never)

    await runTick()

    expect(settleAuctionWithBidMock).not.toHaveBeenCalled()
    expect(auction.status).toBe(AUCTION_STATUSES.Closed)
  })
})

describe('processAuction: auto-accept trigger window', () => {
  it('auto-accepts once inside the trigger window, ahead of expiry', async () => {
    const auction = fakeAuction({
      expiresAt: new Date(Date.now() + 30 * 60_000), // 30 min from now
      autoAcceptTriggerHours: 1, // window opens 1h before expiry -> already inside it
      bestBidAmount: 600,
      capPrice: 1000,
    })
    findActiveAuctionsMock.mockResolvedValue([auction] as never)
    findBidOneMock.mockReturnValue({ sort: jest.fn().mockResolvedValue(fakeBid(600)) } as never)

    await runTick()

    expect(settleAuctionWithBidMock).toHaveBeenCalledWith(
      auction,
      expect.objectContaining({ amount: 600 })
    )
  })

  it('falls through to price creep when still outside the trigger window', async () => {
    const auction = fakeAuction({
      expiresAt: new Date(Date.now() + 5 * MS_PER_HOUR),
      autoAcceptTriggerHours: 1,
      bestBidAmount: 600,
      capPrice: 1000,
      currentPrice: 500,
      priceCreepAmount: 50,
      lastPriceUpdateAt: new Date(0),
    })
    findActiveAuctionsMock.mockResolvedValue([auction] as never)

    await runTick()

    expect(settleAuctionWithBidMock).not.toHaveBeenCalled()
    expect(auction.currentPrice).toBe(550)
  })
})

describe('processAuction: price creep', () => {
  it('does nothing once the current price has already reached the cap', async () => {
    const auction = fakeAuction({ currentPrice: 1000, capPrice: 1000 })
    findActiveAuctionsMock.mockResolvedValue([auction] as never)

    await runTick()

    expect(auction.save).not.toHaveBeenCalled()
  })

  it('does not creep before the creep interval has elapsed', async () => {
    const auction = fakeAuction({
      currentPrice: 500,
      priceCreepIntervalHours: 1,
      lastPriceUpdateAt: new Date(),
    })
    findActiveAuctionsMock.mockResolvedValue([auction] as never)

    await runTick()

    expect(auction.save).not.toHaveBeenCalled()
    expect(auction.currentPrice).toBe(500)
  })

  it('creeps the price by priceCreepAmount, clamped to the cap', async () => {
    const auction = fakeAuction({
      currentPrice: 980,
      capPrice: 1000,
      priceCreepAmount: 50,
      lastPriceUpdateAt: new Date(0),
    })
    findActiveAuctionsMock.mockResolvedValue([auction] as never)

    await runTick()

    expect(auction.currentPrice).toBe(1000)
    expect(auction.save).toHaveBeenCalled()
  })

  it('settles the auction once the crept price reaches the lowest submitted bid', async () => {
    const auction = fakeAuction({
      currentPrice: 500,
      capPrice: 1000,
      priceCreepAmount: 100,
      lastPriceUpdateAt: new Date(0),
    })
    findActiveAuctionsMock.mockResolvedValue([auction] as never)
    findBidOneMock.mockReturnValue({ sort: jest.fn().mockResolvedValue(fakeBid(600)) } as never)

    await runTick()

    expect(auction.currentPrice).toBe(600)
    expect(settleAuctionWithBidMock).toHaveBeenCalledWith(
      auction,
      expect.objectContaining({ amount: 600 })
    )
  })

  it('auto-accepts the best in-range bid once the cap is reached', async () => {
    const auction = fakeAuction({
      currentPrice: 950,
      capPrice: 1000,
      priceCreepAmount: 50,
      autoAcceptPercent: 0,
      bestBidAmount: 1000,
      lastPriceUpdateAt: new Date(0),
    })
    findActiveAuctionsMock.mockResolvedValue([auction] as never)
    findBidOneMock.mockReturnValue({ sort: jest.fn().mockResolvedValue(fakeBid(1000)) } as never)

    await runTick()

    expect(auction.currentPrice).toBe(1000)
    expect(settleAuctionWithBidMock).toHaveBeenCalledWith(
      auction,
      expect.objectContaining({ amount: 1000 })
    )
  })
})
