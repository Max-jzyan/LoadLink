import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  createTestStore,
  seedToken,
  restoreFetch,
  mockFetchResponse,
  getFetchCalls,
  resetFetchCalls,
  fixtures,
} from './helpers'
import { api } from '../api'
import { loadApi } from '../loadApi/loadSlice'
import { __setCachedTokenForTests } from '../api'

void loadApi

function lastCall() {
  const calls = getFetchCalls()
  return calls[calls.length - 1]
}

describe('loadApi endpoints', () => {
  beforeEach(() => {
    resetFetchCalls()
    __setCachedTokenForTests(null)
  })

  afterEach(() => {
    restoreFetch()
  })

  describe('listAvailableLoads', () => {
    it('[URL] GET loads with optional status query param', async () => {
      mockFetchResponse({ status: 200, body: [fixtures.load()] })
      const store = createTestStore()
      await store.dispatch(api.endpoints.listAvailableLoads.initiate('auction_live'))
      expect(lastCall().url).toContain('/api/loads?status=auction_live')
      expect(lastCall().method).toBe('GET')
    })

    it('[URL] GET loads with no status → bare path', async () => {
      mockFetchResponse({ status: 200, body: [] })
      const store = createTestStore()
      await store.dispatch(api.endpoints.listAvailableLoads.initiate())
      expect(lastCall().url).toContain('/api/loads')
      expect(lastCall().url).not.toContain('?status=')
    })

    it('[Success] data lands in cache', async () => {
      const loads = [fixtures.load(), fixtures.load({ _id: 'load-2' })]
      mockFetchResponse({ status: 200, body: loads })
      const store = createTestStore()
      await store.dispatch(api.endpoints.listAvailableLoads.initiate())
      const state = api.endpoints.listAvailableLoads.select()(store.getState())
      expect(state.data).toHaveLength(2)
    })

    it('[Error] 500 sets error state', async () => {
      mockFetchResponse({ status: 500, body: { message: 'Boom' } })
      const store = createTestStore()
      await store.dispatch(api.endpoints.listAvailableLoads.initiate())
      const state = api.endpoints.listAvailableLoads.select()(store.getState())
      expect(state.isError).toBe(true)
    })
  })

  describe('getLoad', () => {
    it('[URL] GET loads/:loadId', async () => {
      mockFetchResponse({ status: 200, body: fixtures.load() })
      const store = createTestStore()
      await store.dispatch(api.endpoints.getLoad.initiate('load-1'))
      expect(lastCall().url).toContain('/api/loads/load-1')
      expect(lastCall().method).toBe('GET')
    })

    it('[Success] data lands in cache', async () => {
      mockFetchResponse({ status: 200, body: fixtures.load() })
      const store = createTestStore()
      await store.dispatch(api.endpoints.getLoad.initiate('load-1'))
      const state = api.endpoints.getLoad.select('load-1')(store.getState())
      expect(state.data?._id).toBe('load-1')
    })

    it('[Error] 404 sets error state', async () => {
      mockFetchResponse({ status: 404, body: { message: 'Not found' } })
      const store = createTestStore()
      await store.dispatch(api.endpoints.getLoad.initiate('load-1'))
      const state = api.endpoints.getLoad.select('load-1')(store.getState())
      expect(state.isError).toBe(true)
    })
  })

  describe('getAcceptedBid', () => {
    it('[URL] GET loads/:loadId/accepted-bid', async () => {
      mockFetchResponse({ status: 200, body: { _id: 'bid-1', amount: 1200 } })
      const store = createTestStore()
      await store.dispatch(api.endpoints.getAcceptedBid.initiate('load-1'))
      expect(lastCall().url).toContain('/api/loads/load-1/accepted-bid')
      expect(lastCall().method).toBe('GET')
    })

    it('[Success] data lands in cache', async () => {
      mockFetchResponse({ status: 200, body: { _id: 'bid-1', amount: 1200 } })
      const store = createTestStore()
      await store.dispatch(api.endpoints.getAcceptedBid.initiate('load-1'))
      const state = api.endpoints.getAcceptedBid.select('load-1')(store.getState())
      expect(state.data?._id).toBe('bid-1')
    })

    it('[Error] 500 sets error state', async () => {
      mockFetchResponse({ status: 500, body: {} })
      const store = createTestStore()
      await store.dispatch(api.endpoints.getAcceptedBid.initiate('load-1'))
      const state = api.endpoints.getAcceptedBid.select('load-1')(store.getState())
      expect(state.isError).toBe(true)
    })
  })

  describe('getBol', () => {
    it('[URL] GET loads/:loadId/bol', async () => {
      mockFetchResponse({ status: 200, body: { bidId: 'bid-1', bolUrl: 'http://s3/bol' } })
      const store = createTestStore()
      await store.dispatch(api.endpoints.getBol.initiate('load-1'))
      expect(lastCall().url).toContain('/api/loads/load-1/bol')
      expect(lastCall().method).toBe('GET')
    })

    it('[Success] data lands in cache', async () => {
      mockFetchResponse({ status: 200, body: { bidId: 'bid-1', bolUrl: 'http://s3/bol' } })
      const store = createTestStore()
      await store.dispatch(api.endpoints.getBol.initiate('load-1'))
      const state = api.endpoints.getBol.select('load-1')(store.getState())
      expect(state.data?.bidId).toBe('bid-1')
    })

    it('[Error] 404 sets error state', async () => {
      mockFetchResponse({ status: 404, body: {} })
      const store = createTestStore()
      await store.dispatch(api.endpoints.getBol.initiate('load-1'))
      const state = api.endpoints.getBol.select('load-1')(store.getState())
      expect(state.isError).toBe(true)
    })
  })

  describe('submitSignedBol', () => {
    it('[URL/Body] POST loads/:loadId/bol/signed with s3Key', async () => {
      mockFetchResponse({ status: 200, body: { signedBolUrl: 'http://s3/signed' } })
      const store = createTestStore()
      await store.dispatch(api.endpoints.submitSignedBol.initiate({ loadId: 'load-1', s3Key: 'bol-key-123' }))
      expect(lastCall().url).toContain('/api/loads/load-1/bol/signed')
      expect(lastCall().method).toBe('POST')
      expect(lastCall().body).toEqual({ s3Key: 'bol-key-123' })
    })

    it('[Success] data lands in cache', async () => {
      mockFetchResponse({ status: 200, body: { signedBolUrl: 'http://s3/signed' } })
      const store = createTestStore()
      const result = await store.dispatch(api.endpoints.submitSignedBol.initiate({ loadId: 'load-1', s3Key: 'k' }))
      expect(result.data).toEqual({ signedBolUrl: 'http://s3/signed' })
    })

    it('[Error] 500 sets error state', async () => {
      mockFetchResponse({ status: 500, body: {} })
      const store = createTestStore()
      const result = await store.dispatch(api.endpoints.submitSignedBol.initiate({ loadId: 'load-1', s3Key: 'k' }))
      expect(result.error).toBeDefined()
    })
  })

  describe('listCompanyLoads', () => {
    it('[URL] GET company/:companyId/loads with filters', async () => {
      mockFetchResponse({ status: 200, body: [fixtures.load()] })
      const store = createTestStore()
      await store.dispatch(api.endpoints.listCompanyLoads.initiate({
        companyId: 'company-1',
        assignedDriverId: 'driver-1',
        excludeReviewedBy: 'company-1',
        status: 'delivered',
      }))
      expect(lastCall().url).toContain('/api/company/company-1/loads')
      expect(lastCall().url).toContain('assignedDriverId=driver-1')
      expect(lastCall().url).toContain('excludeReviewedBy=company-1')
      expect(lastCall().url).toContain('status=delivered')
      expect(lastCall().method).toBe('GET')
    })

    it('[URL] GET company/:companyId/loads with plain string arg', async () => {
      mockFetchResponse({ status: 200, body: [] })
      const store = createTestStore()
      await store.dispatch(api.endpoints.listCompanyLoads.initiate('company-1'))
      expect(lastCall().url).toContain('/api/company/company-1/loads')
      expect(lastCall().url).not.toContain('?')
    })

    it('[Success] data lands in cache', async () => {
      mockFetchResponse({ status: 200, body: [fixtures.load()] })
      const store = createTestStore()
      await store.dispatch(api.endpoints.listCompanyLoads.initiate('company-1'))
      const state = api.endpoints.listCompanyLoads.select('company-1')(store.getState())
      expect(state.data).toHaveLength(1)
    })

    it('[Error] 500 sets error state', async () => {
      mockFetchResponse({ status: 500, body: {} })
      const store = createTestStore()
      await store.dispatch(api.endpoints.listCompanyLoads.initiate('company-1'))
      const state = api.endpoints.listCompanyLoads.select('company-1')(store.getState())
      expect(state.isError).toBe(true)
    })
  })

  describe('createLoad', () => {
    it('[URL/Body] POST company/:companyId/loads with body', async () => {
      mockFetchResponse({ status: 201, body: fixtures.load() })
      const store = createTestStore()
      const payload = { origin: 'Calgary', destination: 'Vancouver', cargo: 'Freight' }
      await store.dispatch(api.endpoints.createLoad.initiate({ companyId: 'company-1', body: payload }))
      expect(lastCall().url).toContain('/api/company/company-1/loads')
      expect(lastCall().method).toBe('POST')
      expect(lastCall().body).toEqual(payload)
    })

    it('[Headers] Authorization present when token cached', async () => {
      await seedToken('my-token')
      mockFetchResponse({ status: 201, body: fixtures.load() })
      const store = createTestStore()
      await store.dispatch(api.endpoints.createLoad.initiate({ companyId: 'company-1', body: {} }))
      expect(lastCall().headers['authorization']).toBe('Bearer my-token')
    })

    it('[Success] data in result', async () => {
      mockFetchResponse({ status: 201, body: fixtures.load() })
      const store = createTestStore()
      const result = await store.dispatch(api.endpoints.createLoad.initiate({ companyId: 'company-1', body: {} }))
      expect(result.data?._id).toBe('load-1')
    })

    it('[Error] 400 sets error', async () => {
      mockFetchResponse({ status: 400, body: { message: 'Bad request' } })
      const store = createTestStore()
      const result = await store.dispatch(api.endpoints.createLoad.initiate({ companyId: 'company-1', body: {} }))
      expect(result.error).toBeDefined()
    })
  })

  describe('createAuction', () => {
    it('[URL/Body] POST auctions/:loadId with body', async () => {
      mockFetchResponse({ status: 201, body: { _id: 'auction-1', loadId: 'load-1' } })
      const store = createTestStore()
      const payload = { maxPriceCap: 2000, step: 50 }
      await store.dispatch(api.endpoints.createAuction.initiate({ loadId: 'load-1', body: payload }))
      expect(lastCall().url).toContain('/api/auctions/load-1')
      expect(lastCall().method).toBe('POST')
      expect(lastCall().body).toEqual(payload)
    })

    it('[Success] data in result', async () => {
      mockFetchResponse({ status: 201, body: { _id: 'auction-1', loadId: 'load-1' } })
      const store = createTestStore()
      const result = await store.dispatch(api.endpoints.createAuction.initiate({ loadId: 'load-1', body: {} }))
      expect(result.data?._id).toBe('auction-1')
    })

    it('[Error] 400 sets error', async () => {
      mockFetchResponse({ status: 400, body: {} })
      const store = createTestStore()
      const result = await store.dispatch(api.endpoints.createAuction.initiate({ loadId: 'load-1', body: {} }))
      expect(result.error).toBeDefined()
    })
  })

  describe('updateLoad', () => {
    it('[URL/Body] PATCH loads/:loadId with body', async () => {
      mockFetchResponse({ status: 200, body: fixtures.load() })
      const store = createTestStore()
      const payload = { cargo: 'Updated freight' }
      await store.dispatch(api.endpoints.updateLoad.initiate({ loadId: 'load-1', body: payload }))
      expect(lastCall().url).toContain('/api/loads/load-1')
      expect(lastCall().method).toBe('PATCH')
      expect(lastCall().body).toEqual(payload)
    })

    it('[Success] data in result', async () => {
      mockFetchResponse({ status: 200, body: fixtures.load() })
      const store = createTestStore()
      const result = await store.dispatch(api.endpoints.updateLoad.initiate({ loadId: 'load-1', body: {} }))
      expect(result.data?._id).toBe('load-1')
    })

    it('[Error] 404 sets error', async () => {
      mockFetchResponse({ status: 404, body: {} })
      const store = createTestStore()
      const result = await store.dispatch(api.endpoints.updateLoad.initiate({ loadId: 'load-1', body: {} }))
      expect(result.error).toBeDefined()
    })
  })

  describe('updateLoadStatus', () => {
    it('[URL/Body] PATCH driver/:driverId/loads/:loadId/status with status body', async () => {
      mockFetchResponse({ status: 200, body: fixtures.load() })
      const store = createTestStore()
      await store.dispatch(api.endpoints.updateLoadStatus.initiate({ driverId: 'driver-1', loadId: 'load-1', status: 'picked_up' }))
      expect(lastCall().url).toContain('/api/driver/driver-1/loads/load-1/status')
      expect(lastCall().method).toBe('PATCH')
      expect(lastCall().body).toEqual({ status: 'picked_up' })
    })

    it('[Success] data in result', async () => {
      mockFetchResponse({ status: 200, body: fixtures.load() })
      const store = createTestStore()
      const result = await store.dispatch(api.endpoints.updateLoadStatus.initiate({ driverId: 'driver-1', loadId: 'load-1', status: 'picked_up' }))
      expect(result.data?._id).toBe('load-1')
    })

    it('[Error] 403 sets error', async () => {
      mockFetchResponse({ status: 403, body: { message: 'Forbidden' } })
      const store = createTestStore()
      const result = await store.dispatch(api.endpoints.updateLoadStatus.initiate({ driverId: 'driver-1', loadId: 'load-1', status: 'picked_up' }))
      expect(result.error).toBeDefined()
    })
  })

  describe('checkIn', () => {
    it('[URL/Body] POST loads/:loadId/checkin with lat/lng body', async () => {
      mockFetchResponse({ status: 200, body: fixtures.load() })
      const store = createTestStore()
      await store.dispatch(api.endpoints.checkIn.initiate({ loadId: 'load-1', body: { lat: 51.04, lng: -114.07 } }))
      expect(lastCall().url).toContain('/api/loads/load-1/checkin')
      expect(lastCall().method).toBe('POST')
      expect(lastCall().body).toEqual({ lat: 51.04, lng: -114.07 })
    })

    it('[Success] data in result', async () => {
      mockFetchResponse({ status: 200, body: fixtures.load() })
      const store = createTestStore()
      const result = await store.dispatch(api.endpoints.checkIn.initiate({ loadId: 'load-1', body: { lat: 0, lng: 0 } }))
      expect(result.data?._id).toBe('load-1')
    })

    it('[Error] 404 sets error', async () => {
      mockFetchResponse({ status: 404, body: {} })
      const store = createTestStore()
      const result = await store.dispatch(api.endpoints.checkIn.initiate({ loadId: 'load-1', body: { lat: 0, lng: 0 } }))
      expect(result.error).toBeDefined()
    })
  })

  describe('updateLoadExpenses', () => {
    it('[URL/Body] PATCH loads/:loadId/expenses with expense overrides', async () => {
      mockFetchResponse({ status: 200, body: fixtures.load() })
      const store = createTestStore()
      const payload = { fuelCost: 200, driverPay: 500 }
      await store.dispatch(api.endpoints.updateLoadExpenses.initiate({ loadId: 'load-1', body: payload }))
      expect(lastCall().url).toContain('/api/loads/load-1/expenses')
      expect(lastCall().method).toBe('PATCH')
      expect(lastCall().body).toEqual(payload)
    })

    it('[Success] data in result', async () => {
      mockFetchResponse({ status: 200, body: fixtures.load() })
      const store = createTestStore()
      const result = await store.dispatch(api.endpoints.updateLoadExpenses.initiate({ loadId: 'load-1', body: {} }))
      expect(result.data?._id).toBe('load-1')
    })

    it('[Error] 403 sets error', async () => {
      mockFetchResponse({ status: 403, body: { message: 'Forbidden' } })
      const store = createTestStore()
      const result = await store.dispatch(api.endpoints.updateLoadExpenses.initiate({ loadId: 'load-1', body: {} }))
      expect(result.error).toBeDefined()
    })
  })

  describe('Authorization header', () => {
    it('injects Bearer token when cachedToken is set', async () => {
      await seedToken('header-test-token')
      mockFetchResponse({ status: 200, body: fixtures.load() })
      const store = createTestStore()
      await store.dispatch(api.endpoints.getLoad.initiate('load-1'))
      expect(lastCall().headers['authorization']).toBe('Bearer header-test-token')
    })

    it('omits Authorization when no token cached', async () => {
      __setCachedTokenForTests(null)
      mockFetchResponse({ status: 200, body: fixtures.load() })
      const store = createTestStore()
      await store.dispatch(api.endpoints.getLoad.initiate('load-1'))
      expect(lastCall().headers['authorization']).toBeUndefined()
    })
  })
})