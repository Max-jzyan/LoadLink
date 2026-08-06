import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest'
import {
  createTestStore,
  restoreFetch,
  mockFetchResponse,
  getFetchCalls,
  resetFetchCalls,
} from './helpers'
import { getMockEventSources, resetMockEventSources, restoreEventSource } from '../../test/setup'
import { api } from '../api'
import { auctionApi } from '../auctionApi/auctionSlice'
import { __setCachedTokenForTests } from '../api'

void auctionApi

function lastCall() {
  const calls = getFetchCalls()
  return calls[calls.length - 1]
}

describe('auctionApi endpoints', () => {
  beforeEach(() => {
    resetFetchCalls()
    resetMockEventSources()
    __setCachedTokenForTests(null)
  })

  afterEach(() => {
    restoreFetch()
    resetMockEventSources()
  })

  afterAll(() => {
    restoreEventSource()
  })

  describe('acceptBid', () => {
    it('[URL/Method] PATCH auctions/:loadId/bids/:bidId', async () => {
      mockFetchResponse({ status: 200, body: { loadId: 'load-1', driverId: 'driver-1', bidId: 'bid-1' } })
      const store = createTestStore()
      await store.dispatch(api.endpoints.acceptBid.initiate({ loadId: 'load-1', bidId: 'bid-1' }))
      expect(lastCall().url).toContain('/api/auctions/load-1/bids/bid-1')
      expect(lastCall().method).toBe('PATCH')
    })

    it('[Success] data in result', async () => {
      mockFetchResponse({ status: 200, body: { loadId: 'load-1', driverId: 'driver-1' } })
      const store = createTestStore()
      const result = await store.dispatch(api.endpoints.acceptBid.initiate({ loadId: 'load-1', bidId: 'bid-1' }))
      expect(result.data?.loadId).toBe('load-1')
    })

    it('[Error] 404 sets error', async () => {
      mockFetchResponse({ status: 404, body: {} })
      const store = createTestStore()
      const result = await store.dispatch(api.endpoints.acceptBid.initiate({ loadId: 'load-1', bidId: 'bid-1' }))
      expect(result.error).toBeDefined()
    })
  })

  describe('editAuction', () => {
    it('[URL/Body] PATCH auctions/:loadId with body', async () => {
      mockFetchResponse({ status: 200, body: { loadId: 'load-1' } })
      const store = createTestStore()
      const payload = { maxPriceCap: 2500 }
      await store.dispatch(api.endpoints.editAuction.initiate({ loadId: 'load-1', body: payload }))
      expect(lastCall().url).toContain('/api/auctions/load-1')
      expect(lastCall().method).toBe('PATCH')
      expect(lastCall().body).toEqual(payload)
    })

    it('[Success] data in result', async () => {
      mockFetchResponse({ status: 200, body: { loadId: 'load-1' } })
      const store = createTestStore()
      const result = await store.dispatch(api.endpoints.editAuction.initiate({ loadId: 'load-1', body: {} }))
      expect(result.data?.loadId).toBe('load-1')
    })

    it('[Error] 400 sets error', async () => {
      mockFetchResponse({ status: 400, body: {} })
      const store = createTestStore()
      const result = await store.dispatch(api.endpoints.editAuction.initiate({ loadId: 'load-1', body: {} }))
      expect(result.error).toBeDefined()
    })
  })

  describe('cancelAuction', () => {
    it('[URL/Method] DELETE auctions/:loadId', async () => {
      mockFetchResponse({ status: 200, body: {} })
      const store = createTestStore()
      await store.dispatch(api.endpoints.cancelAuction.initiate('load-1'))
      expect(lastCall().url).toContain('/api/auctions/load-1')
      expect(lastCall().method).toBe('DELETE')
    })

    it('[Success] no error', async () => {
      mockFetchResponse({ status: 200, body: {} })
      const store = createTestStore()
      const result = await store.dispatch(api.endpoints.cancelAuction.initiate('load-1'))
      expect(result.error).toBeUndefined()
    })

    it('[Error] 404 sets error', async () => {
      mockFetchResponse({ status: 404, body: {} })
      const store = createTestStore()
      const result = await store.dispatch(api.endpoints.cancelAuction.initiate('load-1'))
      expect(result.error).toBeDefined()
    })
  })

  describe('reopenAuction', () => {
    it('[URL/Body] POST auctions/:loadId/reopen with body', async () => {
      mockFetchResponse({ status: 200, body: { loadId: 'load-1' } })
      const store = createTestStore()
      const payload = { maxPriceCap: 3000 }
      await store.dispatch(api.endpoints.reopenAuction.initiate({ loadId: 'load-1', body: payload }))
      expect(lastCall().url).toContain('/api/auctions/load-1/reopen')
      expect(lastCall().method).toBe('POST')
      expect(lastCall().body).toEqual(payload)
    })

    it('[Success] data in result', async () => {
      mockFetchResponse({ status: 200, body: { loadId: 'load-1' } })
      const store = createTestStore()
      const result = await store.dispatch(api.endpoints.reopenAuction.initiate({ loadId: 'load-1', body: {} }))
      expect(result.data?.loadId).toBe('load-1')
    })

    it('[Error] 400 sets error', async () => {
      mockFetchResponse({ status: 400, body: {} })
      const store = createTestStore()
      const result = await store.dispatch(api.endpoints.reopenAuction.initiate({ loadId: 'load-1', body: {} }))
      expect(result.error).toBeDefined()
    })
  })

  describe('streamBids (SSE)', () => {
    it('[SSE] opens EventSource at /api/auctions/:loadId/bids with access_token', async () => {
      const store = createTestStore()
      const promise = store.dispatch(api.endpoints.streamBids.initiate('load-1'))
      await new Promise((r) => setTimeout(r, 10))
      const ess = getMockEventSources()
      expect(ess.length).toBeGreaterThanOrEqual(1)
      const es = ess[ess.length - 1]
      expect(es.url).toContain('/api/auctions/load-1/bids')
      expect(es.url).toContain('access_token=')
      promise.unsubscribe()
      await new Promise((r) => setTimeout(r, 10))
    })

    it('[SSE] onmessage payload flows into cache via updateCachedData', async () => {
      const store = createTestStore()
      const promise = store.dispatch(api.endpoints.streamBids.initiate('load-1'))
      await new Promise((r) => setTimeout(r, 10))
      const ess = getMockEventSources()
      const es = ess[ess.length - 1]
      const bidPayload = { bids: [{ _id: 'bid-1', amount: 1200 }], loadId: 'load-1' }
      es.emit(bidPayload)
      await new Promise((r) => setTimeout(r, 5))
      const state = api.endpoints.streamBids.select('load-1')(store.getState())
      expect(state.data).toEqual(bidPayload)
      promise.unsubscribe()
      await new Promise((r) => setTimeout(r, 10))
    })

    it('[SSE] close() called on cacheEntryRemoved', async () => {
      const store = createTestStore()
      const promise = store.dispatch(api.endpoints.streamBids.initiate('load-1'))
      await new Promise((r) => setTimeout(r, 10))
      const ess = getMockEventSources()
      const es = ess[ess.length - 1]
      promise.unsubscribe()
      await new Promise((r) => setTimeout(r, 10))
      expect(es.readyState).toBe(2)
    })
  })

  describe('streamAuctionPrice (SSE)', () => {
    it('[SSE] opens EventSource at /api/auctions/:loadId/price with access_token', async () => {
      const store = createTestStore()
      const promise = store.dispatch(api.endpoints.streamAuctionPrice.initiate('load-1'))
      await new Promise((r) => setTimeout(r, 10))
      const ess = getMockEventSources()
      expect(ess.length).toBeGreaterThanOrEqual(1)
      const es = ess[ess.length - 1]
      expect(es.url).toContain('/api/auctions/load-1/price')
      expect(es.url).toContain('access_token=')
      promise.unsubscribe()
      await new Promise((r) => setTimeout(r, 10))
    })

    it('[SSE] onmessage payload flows into cache via updateCachedData', async () => {
      const store = createTestStore()
      const promise = store.dispatch(api.endpoints.streamAuctionPrice.initiate('load-1'))
      await new Promise((r) => setTimeout(r, 10))
      const ess = getMockEventSources()
      const es = ess[ess.length - 1]
      const pricePayload = { loadId: 'load-1', currentPrice: 1300 }
      es.emit(pricePayload)
      await new Promise((r) => setTimeout(r, 5))
      const state = api.endpoints.streamAuctionPrice.select('load-1')(store.getState())
      expect(state.data).toEqual(pricePayload)
      promise.unsubscribe()
      await new Promise((r) => setTimeout(r, 10))
    })

    it('[SSE] close() called on cacheEntryRemoved', async () => {
      const store = createTestStore()
      const promise = store.dispatch(api.endpoints.streamAuctionPrice.initiate('load-1'))
      await new Promise((r) => setTimeout(r, 10))
      const ess = getMockEventSources()
      const es = ess[ess.length - 1]
      promise.unsubscribe()
      await new Promise((r) => setTimeout(r, 10))
      expect(es.readyState).toBe(2)
    })
  })
})