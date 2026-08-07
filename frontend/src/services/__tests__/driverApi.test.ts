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
import { driverApi } from '../driverApi/driverSlice'
import { __setCachedTokenForTests } from '../api'

function lastCall() {
  const calls = getFetchCalls()
  return calls[calls.length - 1]
}

describe('driverApi endpoints', () => {
  beforeEach(() => {
    resetFetchCalls()
    __setCachedTokenForTests(null)
  })

  afterEach(() => {
    restoreFetch()
  })

  describe('getConflictingBids', () => {
    it('[URL] GET driver/:driverId/conflicting-bids/:loadId', async () => {
      mockFetchResponse({ status: 200, body: [] })
      const store = createTestStore()
      await store.dispatch(driverApi.endpoints.getConflictingBids.initiate({ driverId: 'driver-1', loadId: 'load-1' }))
      expect(lastCall().url).toContain('/api/driver/driver-1/conflicting-bids/load-1')
      expect(lastCall().method).toBe('GET')
    })

    it('[Success] data lands in cache', async () => {
      const conflicts = [{ loadId: 'load-2', conflictType: 'accepted_job' }]
      mockFetchResponse({ status: 200, body: conflicts })
      const store = createTestStore()
      const key = { driverId: 'driver-1', loadId: 'load-1' }
      await store.dispatch(driverApi.endpoints.getConflictingBids.initiate(key))
      const state = driverApi.endpoints.getConflictingBids.select(key)(store.getState())
      expect(state.data).toHaveLength(1)
    })

    it('[Error] 500 sets error state', async () => {
      mockFetchResponse({ status: 500, body: {} })
      const store = createTestStore()
      await store.dispatch(driverApi.endpoints.getConflictingBids.initiate({ driverId: 'driver-1', loadId: 'load-1' }))
      const state = driverApi.endpoints.getConflictingBids.select({ driverId: 'driver-1', loadId: 'load-1' })(store.getState())
      expect(state.isError).toBe(true)
    })
  })

  describe('placeBid', () => {
    it('[URL/Body] POST auctions/:loadId/bids with payload', async () => {
      mockFetchResponse({ status: 201, body: fixtures.bid() })
      const store = createTestStore()
      const body = { driverId: 'driver-1', amount: 1200, selectedTruckId: 'truck-1' }
      await store.dispatch(driverApi.endpoints.placeBid.initiate({ loadId: 'load-1', body }))
      expect(lastCall().url).toContain('/api/auctions/load-1/bids')
      expect(lastCall().method).toBe('POST')
      expect(lastCall().body).toEqual(body)
    })

    it('[Headers] Authorization present when token cached', async () => {
      await seedToken('bid-token')
      mockFetchResponse({ status: 201, body: fixtures.bid() })
      const store = createTestStore()
      await store.dispatch(driverApi.endpoints.placeBid.initiate({ loadId: 'load-1', body: { driverId: 'driver-1', amount: 100 } }))
      expect(lastCall().headers['authorization']).toBe('Bearer bid-token')
    })

    it('[Success] data in result', async () => {
      mockFetchResponse({ status: 201, body: fixtures.bid() })
      const store = createTestStore()
      const result = await store.dispatch(driverApi.endpoints.placeBid.initiate({ loadId: 'load-1', body: { driverId: 'driver-1', amount: 100 } }))
      expect(result.data?._id).toBe('bid-1')
    })

    it('[Error] 400 sets error', async () => {
      mockFetchResponse({ status: 400, body: { message: 'Bad bid' } })
      const store = createTestStore()
      const result = await store.dispatch(driverApi.endpoints.placeBid.initiate({ loadId: 'load-1', body: { driverId: 'driver-1', amount: 100 } }))
      expect(result.error).toBeDefined()
    })
  })

  describe('claimLoad', () => {
    it('[URL/Body] POST auctions/:loadId/claim with payload', async () => {
      mockFetchResponse({
        status: 200,
        body: { loadId: 'load-1', driverId: 'driver-1', finalPayout: 1500, rateConfirmationUrl: 'http://s3/rc' },
      })
      const store = createTestStore()
      const body = { driverId: 'driver-1', selectedTruckId: 'truck-1' }
      await store.dispatch(driverApi.endpoints.claimLoad.initiate({ loadId: 'load-1', body }))
      expect(lastCall().url).toContain('/api/auctions/load-1/claim')
      expect(lastCall().method).toBe('POST')
      expect(lastCall().body).toEqual(body)
    })

    it('[Success] data in result', async () => {
      mockFetchResponse({
        status: 200,
        body: { loadId: 'load-1', driverId: 'driver-1', finalPayout: 1500, rateConfirmationUrl: 'http://s3/rc' },
      })
      const store = createTestStore()
      const result = await store.dispatch(driverApi.endpoints.claimLoad.initiate({ loadId: 'load-1', body: { driverId: 'driver-1' } }))
      expect(result.data?.finalPayout).toBe(1500)
    })

    it('[Error] 409 sets error', async () => {
      mockFetchResponse({ status: 409, body: { message: 'Already claimed' } })
      const store = createTestStore()
      const result = await store.dispatch(driverApi.endpoints.claimLoad.initiate({ loadId: 'load-1', body: { driverId: 'driver-1' } }))
      expect(result.error).toBeDefined()
    })
  })

  describe('listDriverBids', () => {
    it('[URL] GET driver/:driverId/bids with status param', async () => {
      mockFetchResponse({ status: 200, body: [] })
      const store = createTestStore()
      await store.dispatch(driverApi.endpoints.listDriverBids.initiate({ driverId: 'driver-1', status: 'pending' }))
      expect(lastCall().url).toContain('/api/driver/driver-1/bids?status=pending')
      expect(lastCall().method).toBe('GET')
    })

    it('[URL] GET driver/:driverId/bids without status', async () => {
      mockFetchResponse({ status: 200, body: [] })
      const store = createTestStore()
      await store.dispatch(driverApi.endpoints.listDriverBids.initiate({ driverId: 'driver-1' }))
      expect(lastCall().url).toContain('/api/driver/driver-1/bids')
      expect(lastCall().url).not.toContain('?')
    })

    it('[Success] data lands in cache', async () => {
      mockFetchResponse({ status: 200, body: [fixtures.bid()] })
      const store = createTestStore()
      await store.dispatch(driverApi.endpoints.listDriverBids.initiate({ driverId: 'driver-1' }))
      const state = driverApi.endpoints.listDriverBids.select({ driverId: 'driver-1' })(store.getState())
      expect(state.data).toHaveLength(1)
    })

    it('[Error] 500 sets error state', async () => {
      mockFetchResponse({ status: 500, body: {} })
      const store = createTestStore()
      await store.dispatch(driverApi.endpoints.listDriverBids.initiate({ driverId: 'driver-1' }))
      const state = driverApi.endpoints.listDriverBids.select({ driverId: 'driver-1' })(store.getState())
      expect(state.isError).toBe(true)
    })
  })

  describe('listDriverLoads', () => {
    it('[URL] GET driver/:driverId/loads with status param', async () => {
      mockFetchResponse({ status: 200, body: [] })
      const store = createTestStore()
      await store.dispatch(driverApi.endpoints.listDriverLoads.initiate({ driverId: 'driver-1', status: 'in_transit' }))
      expect(lastCall().url).toContain('/api/driver/driver-1/loads?status=in_transit')
      expect(lastCall().method).toBe('GET')
    })

    it('[Success] data lands in cache', async () => {
      mockFetchResponse({ status: 200, body: [fixtures.load()] })
      const store = createTestStore()
      await store.dispatch(driverApi.endpoints.listDriverLoads.initiate({ driverId: 'driver-1' }))
      const state = driverApi.endpoints.listDriverLoads.select({ driverId: 'driver-1' })(store.getState())
      expect(state.data).toHaveLength(1)
    })

    it('[Error] 500 sets error state', async () => {
      mockFetchResponse({ status: 500, body: {} })
      const store = createTestStore()
      await store.dispatch(driverApi.endpoints.listDriverLoads.initiate({ driverId: 'driver-1' }))
      const state = driverApi.endpoints.listDriverLoads.select({ driverId: 'driver-1' })(store.getState())
      expect(state.isError).toBe(true)
    })
  })

  describe('getRecommendedLoads', () => {
    it('[URL] GET driver/:driverId/recommended-loads', async () => {
      mockFetchResponse({ status: 200, body: [] })
      const store = createTestStore()
      await store.dispatch(driverApi.endpoints.getRecommendedLoads.initiate('driver-1'))
      expect(lastCall().url).toContain('/api/driver/driver-1/recommended-loads')
      expect(lastCall().method).toBe('GET')
    })

    it('[Success] data lands in cache', async () => {
      mockFetchResponse({ status: 200, body: [fixtures.load()] })
      const store = createTestStore()
      await store.dispatch(driverApi.endpoints.getRecommendedLoads.initiate('driver-1'))
      const state = driverApi.endpoints.getRecommendedLoads.select('driver-1')(store.getState())
      expect(state.data).toHaveLength(1)
    })

    it('[Error] 500 sets error state', async () => {
      mockFetchResponse({ status: 500, body: {} })
      const store = createTestStore()
      await store.dispatch(driverApi.endpoints.getRecommendedLoads.initiate('driver-1'))
      const state = driverApi.endpoints.getRecommendedLoads.select('driver-1')(store.getState())
      expect(state.isError).toBe(true)
    })
  })

  describe('getScoredLoads', () => {
    it('[URL] GET driver/:driverId/loads/scored without lat/lng', async () => {
      mockFetchResponse({ status: 200, body: [] })
      const store = createTestStore()
      await store.dispatch(driverApi.endpoints.getScoredLoads.initiate('driver-1'))
      expect(lastCall().url).toContain('/api/driver/driver-1/loads/scored')
      expect(lastCall().url).not.toContain('?')
    })

    it('[URL] GET driver/:driverId/loads/scored?lat&lng with coords', async () => {
      mockFetchResponse({ status: 200, body: [] })
      const store = createTestStore()
      await store.dispatch(driverApi.endpoints.getScoredLoads.initiate({ driverId: 'driver-1', lat: 51.04, lng: -114.07 }))
      expect(lastCall().url).toContain('/api/driver/driver-1/loads/scored?lat=51.04&lng=-114.07')
    })

    it('[Success] data lands in cache', async () => {
      mockFetchResponse({ status: 200, body: [{ loadId: 'load-1', eligibilityFlags: {}, isEligible: true }] })
      const store = createTestStore()
      await store.dispatch(driverApi.endpoints.getScoredLoads.initiate('driver-1'))
      const state = driverApi.endpoints.getScoredLoads.select('driver-1')(store.getState())
      expect(state.data).toHaveLength(1)
    })

    it('[Error] 500 sets error state', async () => {
      mockFetchResponse({ status: 500, body: {} })
      const store = createTestStore()
      await store.dispatch(driverApi.endpoints.getScoredLoads.initiate('driver-1'))
      const state = driverApi.endpoints.getScoredLoads.select('driver-1')(store.getState())
      expect(state.isError).toBe(true)
    })
  })

  describe('getAiStatus', () => {
    it('[URL] GET ai/status', async () => {
      mockFetchResponse({ status: 200, body: { openrouterConfigured: true, model: 'gpt-4o' } })
      const store = createTestStore()
      await store.dispatch(driverApi.endpoints.getAiStatus.initiate())
      expect(lastCall().url).toContain('/api/ai/status')
      expect(lastCall().method).toBe('GET')
    })

    it('[Success] data lands in cache', async () => {
      mockFetchResponse({ status: 200, body: { openrouterConfigured: false, model: '' } })
      const store = createTestStore()
      await store.dispatch(driverApi.endpoints.getAiStatus.initiate())
      const state = driverApi.endpoints.getAiStatus.select()(store.getState())
      expect(state.data?.openrouterConfigured).toBe(false)
    })

    it('[Error] 500 sets error state', async () => {
      mockFetchResponse({ status: 500, body: {} })
      const store = createTestStore()
      await store.dispatch(driverApi.endpoints.getAiStatus.initiate())
      const state = driverApi.endpoints.getAiStatus.select()(store.getState())
      expect(state.isError).toBe(true)
    })
  })

  describe('getAiInsights', () => {
    it('[URL] GET driver/:driverId/ai-insights', async () => {
      mockFetchResponse({ status: 200, body: { available: false } })
      const store = createTestStore()
      await store.dispatch(driverApi.endpoints.getAiInsights.initiate('driver-1'))
      expect(lastCall().url).toContain('/api/driver/driver-1/ai-insights')
      expect(lastCall().method).toBe('GET')
    })

    it('[Success] data lands in cache', async () => {
      mockFetchResponse({ status: 200, body: { available: true, insight: 'Good load' } })
      const store = createTestStore()
      await store.dispatch(driverApi.endpoints.getAiInsights.initiate('driver-1'))
      const state = driverApi.endpoints.getAiInsights.select('driver-1')(store.getState())
      expect(state.data?.available).toBe(true)
    })

    it('[Error] 500 sets error state', async () => {
      mockFetchResponse({ status: 500, body: {} })
      const store = createTestStore()
      await store.dispatch(driverApi.endpoints.getAiInsights.initiate('driver-1'))
      const state = driverApi.endpoints.getAiInsights.select('driver-1')(store.getState())
      expect(state.isError).toBe(true)
    })
  })

  describe('getAiFuelStops', () => {
    it('[URL] GET driver/:driverId/ai-insights/fuel-stops?loadId=', async () => {
      mockFetchResponse({ status: 200, body: { available: false } })
      const store = createTestStore()
      await store.dispatch(driverApi.endpoints.getAiFuelStops.initiate({ driverId: 'driver-1', loadId: 'load-1' }))
      expect(lastCall().url).toContain('/api/driver/driver-1/ai-insights/fuel-stops?loadId=load-1')
      expect(lastCall().method).toBe('GET')
    })

    it('[Success] data lands in cache', async () => {
      mockFetchResponse({ status: 200, body: { available: true, stops: [] } })
      const store = createTestStore()
      const key = { driverId: 'driver-1', loadId: 'load-1' }
      await store.dispatch(driverApi.endpoints.getAiFuelStops.initiate(key))
      const state = driverApi.endpoints.getAiFuelStops.select(key)(store.getState())
      expect(state.data?.available).toBe(true)
    })

    it('[Error] 500 sets error state', async () => {
      mockFetchResponse({ status: 500, body: {} })
      const store = createTestStore()
      const key = { driverId: 'driver-1', loadId: 'load-1' }
      await store.dispatch(driverApi.endpoints.getAiFuelStops.initiate(key))
      const state = driverApi.endpoints.getAiFuelStops.select(key)(store.getState())
      expect(state.isError).toBe(true)
    })
  })

  describe('getAiRestAreas', () => {
    it('[URL] GET driver/:driverId/ai-insights/rest-areas?loadId=', async () => {
      mockFetchResponse({ status: 200, body: { available: false } })
      const store = createTestStore()
      await store.dispatch(driverApi.endpoints.getAiRestAreas.initiate({ driverId: 'driver-1', loadId: 'load-1' }))
      expect(lastCall().url).toContain('/api/driver/driver-1/ai-insights/rest-areas?loadId=load-1')
      expect(lastCall().method).toBe('GET')
    })

    it('[Success] data lands in cache', async () => {
      mockFetchResponse({ status: 200, body: { available: true, areas: [] } })
      const store = createTestStore()
      const key = { driverId: 'driver-1', loadId: 'load-1' }
      await store.dispatch(driverApi.endpoints.getAiRestAreas.initiate(key))
      const state = driverApi.endpoints.getAiRestAreas.select(key)(store.getState())
      expect(state.data?.available).toBe(true)
    })

    it('[Error] 500 sets error state', async () => {
      mockFetchResponse({ status: 500, body: {} })
      const store = createTestStore()
      const key = { driverId: 'driver-1', loadId: 'load-1' }
      await store.dispatch(driverApi.endpoints.getAiRestAreas.initiate(key))
      const state = driverApi.endpoints.getAiRestAreas.select(key)(store.getState())
      expect(state.isError).toBe(true)
    })
  })

  describe('listDriverTrucks', () => {
    it('[URL] GET driver/:driverId/trucks', async () => {
      mockFetchResponse({ status: 200, body: [] })
      const store = createTestStore()
      await store.dispatch(driverApi.endpoints.listDriverTrucks.initiate('driver-1'))
      expect(lastCall().url).toContain('/api/driver/driver-1/trucks')
      expect(lastCall().method).toBe('GET')
    })

    it('[Success] data lands in cache', async () => {
      mockFetchResponse({ status: 200, body: [fixtures.truck()] })
      const store = createTestStore()
      await store.dispatch(driverApi.endpoints.listDriverTrucks.initiate('driver-1'))
      const state = driverApi.endpoints.listDriverTrucks.select('driver-1')(store.getState())
      expect(state.data).toHaveLength(1)
    })

    it('[Error] 500 sets error state', async () => {
      mockFetchResponse({ status: 500, body: {} })
      const store = createTestStore()
      await store.dispatch(driverApi.endpoints.listDriverTrucks.initiate('driver-1'))
      const state = driverApi.endpoints.listDriverTrucks.select('driver-1')(store.getState())
      expect(state.isError).toBe(true)
    })
  })

  describe('getDriverProfile', () => {
    it('[URL] GET driver/:driverId/profile', async () => {
      mockFetchResponse({ status: 200, body: fixtures.driverProfile() })
      const store = createTestStore()
      await store.dispatch(driverApi.endpoints.getDriverProfile.initiate('driver-1'))
      expect(lastCall().url).toContain('/api/driver/driver-1/profile')
      expect(lastCall().method).toBe('GET')
    })

    it('[Success] data lands in cache', async () => {
      mockFetchResponse({ status: 200, body: fixtures.driverProfile() })
      const store = createTestStore()
      await store.dispatch(driverApi.endpoints.getDriverProfile.initiate('driver-1'))
      const state = driverApi.endpoints.getDriverProfile.select('driver-1')(store.getState())
      expect(state.data?._id).toBe('driver-1')
    })

    it('[Error] 404 sets error state', async () => {
      mockFetchResponse({ status: 404, body: {} })
      const store = createTestStore()
      await store.dispatch(driverApi.endpoints.getDriverProfile.initiate('driver-1'))
      const state = driverApi.endpoints.getDriverProfile.select('driver-1')(store.getState())
      expect(state.isError).toBe(true)
    })
  })

  describe('listDriverCompletedLoadsForCompany', () => {
    it('[URL] GET driver/:driverId/completed-loads/:companyId', async () => {
      mockFetchResponse({ status: 200, body: [] })
      const store = createTestStore()
      await store.dispatch(driverApi.endpoints.listDriverCompletedLoadsForCompany.initiate({ driverId: 'driver-1', companyId: 'company-1' }))
      expect(lastCall().url).toContain('/api/driver/driver-1/completed-loads/company-1')
      expect(lastCall().method).toBe('GET')
    })

    it('[Success] data lands in cache', async () => {
      mockFetchResponse({ status: 200, body: [fixtures.load()] })
      const store = createTestStore()
      const key = { driverId: 'driver-1', companyId: 'company-1' }
      await store.dispatch(driverApi.endpoints.listDriverCompletedLoadsForCompany.initiate(key))
      const state = driverApi.endpoints.listDriverCompletedLoadsForCompany.select(key)(store.getState())
      expect(state.data).toHaveLength(1)
    })

    it('[Error] 500 sets error state', async () => {
      mockFetchResponse({ status: 500, body: {} })
      const store = createTestStore()
      const key = { driverId: 'driver-1', companyId: 'company-1' }
      await store.dispatch(driverApi.endpoints.listDriverCompletedLoadsForCompany.initiate(key))
      const state = driverApi.endpoints.listDriverCompletedLoadsForCompany.select(key)(store.getState())
      expect(state.isError).toBe(true)
    })
  })

  describe('updateDriverProfile', () => {
    it('[URL/Body] PATCH driver/:driverId/profile with payload', async () => {
      mockFetchResponse({ status: 200, body: fixtures.driverProfile() })
      const store = createTestStore()
      const payload = { name: 'New Name', professionalTitle: 'Owner-Op' }
      await store.dispatch(driverApi.endpoints.updateDriverProfile.initiate({ driverId: 'driver-1', body: payload }))
      expect(lastCall().url).toContain('/api/driver/driver-1/profile')
      expect(lastCall().method).toBe('PATCH')
      expect(lastCall().body).toEqual(payload)
    })

    it('[Success] data in result', async () => {
      mockFetchResponse({ status: 200, body: fixtures.driverProfile({ professionalTitle: 'O-O' }) })
      const store = createTestStore()
      const result = await store.dispatch(driverApi.endpoints.updateDriverProfile.initiate({ driverId: 'driver-1', body: {} }))
      expect(result.data?._id).toBe('driver-1')
    })

    it('[Error] 400 sets error', async () => {
      mockFetchResponse({ status: 400, body: {} })
      const store = createTestStore()
      const result = await store.dispatch(driverApi.endpoints.updateDriverProfile.initiate({ driverId: 'driver-1', body: {} }))
      expect(result.error).toBeDefined()
    })
  })

  describe('createTruck', () => {
    it('[URL/Body] POST driver/:driverId/trucks with payload', async () => {
      mockFetchResponse({ status: 201, body: fixtures.truck() })
      const store = createTestStore()
      const payload = { make: 'Freightliner', model: 'Cascadia', year: 2020, truckType: 'Dry Van', trailerLengthFt: 53, capacityLbs: 45000, plateNumber: 'AB123' }
      await store.dispatch(driverApi.endpoints.createTruck.initiate({ driverId: 'driver-1', body: payload }))
      expect(lastCall().url).toContain('/api/driver/driver-1/trucks')
      expect(lastCall().method).toBe('POST')
      expect(lastCall().body).toEqual(payload)
    })

    it('[Success] data in result', async () => {
      mockFetchResponse({ status: 201, body: fixtures.truck() })
      const store = createTestStore()
      const result = await store.dispatch(driverApi.endpoints.createTruck.initiate({ driverId: 'driver-1', body: {} as never }))
      expect(result.data?._id).toBe('truck-1')
    })

    it('[Error] 400 sets error', async () => {
      mockFetchResponse({ status: 400, body: {} })
      const store = createTestStore()
      const result = await store.dispatch(driverApi.endpoints.createTruck.initiate({ driverId: 'driver-1', body: {} as never }))
      expect(result.error).toBeDefined()
    })
  })

  describe('updateTruck', () => {
    it('[URL/Body] PATCH driver/:driverId/trucks/:truckId with payload', async () => {
      mockFetchResponse({ status: 200, body: fixtures.truck() })
      const store = createTestStore()
      const payload = { make: 'Kenworth' }
      await store.dispatch(driverApi.endpoints.updateTruck.initiate({ driverId: 'driver-1', truckId: 'truck-1', body: payload }))
      expect(lastCall().url).toContain('/api/driver/driver-1/trucks/truck-1')
      expect(lastCall().method).toBe('PATCH')
      expect(lastCall().body).toEqual(payload)
    })

    it('[Success] data in result', async () => {
      mockFetchResponse({ status: 200, body: fixtures.truck() })
      const store = createTestStore()
      const result = await store.dispatch(driverApi.endpoints.updateTruck.initiate({ driverId: 'driver-1', truckId: 'truck-1', body: {} }))
      expect(result.data?._id).toBe('truck-1')
    })

    it('[Error] 404 sets error', async () => {
      mockFetchResponse({ status: 404, body: {} })
      const store = createTestStore()
      const result = await store.dispatch(driverApi.endpoints.updateTruck.initiate({ driverId: 'driver-1', truckId: 'truck-1', body: {} }))
      expect(result.error).toBeDefined()
    })
  })

  describe('deleteTruck', () => {
    it('[URL] DELETE driver/:driverId/trucks/:truckId', async () => {
      mockFetchResponse({ status: 200, body: {} })
      const store = createTestStore()
      await store.dispatch(driverApi.endpoints.deleteTruck.initiate({ driverId: 'driver-1', truckId: 'truck-1' }))
      expect(lastCall().url).toContain('/api/driver/driver-1/trucks/truck-1')
      expect(lastCall().method).toBe('DELETE')
    })

    it('[Success] resolves', async () => {
      mockFetchResponse({ status: 200, body: {} })
      const store = createTestStore()
      const result = await store.dispatch(driverApi.endpoints.deleteTruck.initiate({ driverId: 'driver-1', truckId: 'truck-1' }))
      expect(result.data).toBeDefined()
    })

    it('[Error] 404 sets error', async () => {
      mockFetchResponse({ status: 404, body: {} })
      const store = createTestStore()
      const result = await store.dispatch(driverApi.endpoints.deleteTruck.initiate({ driverId: 'driver-1', truckId: 'truck-1' }))
      expect(result.error).toBeDefined()
    })
  })

  describe('updateTruckExpenses', () => {
    it('[URL/Body] PATCH driver/:driverId/trucks/:truckId/expenses', async () => {
      mockFetchResponse({ status: 200, body: fixtures.truck() })
      const store = createTestStore()
      const payload = { fuelCostPerLiter: 1.5, fuelEfficiencyKmPerLiter: 3 }
      await store.dispatch(driverApi.endpoints.updateTruckExpenses.initiate({ driverId: 'driver-1', truckId: 'truck-1', body: payload }))
      expect(lastCall().url).toContain('/api/driver/driver-1/trucks/truck-1/expenses')
      expect(lastCall().method).toBe('PATCH')
      expect(lastCall().body).toEqual(payload)
    })

    it('[Success] data in result', async () => {
      mockFetchResponse({ status: 200, body: fixtures.truck() })
      const store = createTestStore()
      const result = await store.dispatch(driverApi.endpoints.updateTruckExpenses.initiate({ driverId: 'driver-1', truckId: 'truck-1', body: {} }))
      expect(result.data?._id).toBe('truck-1')
    })

    it('[Error] 400 sets error', async () => {
      mockFetchResponse({ status: 400, body: {} })
      const store = createTestStore()
      const result = await store.dispatch(driverApi.endpoints.updateTruckExpenses.initiate({ driverId: 'driver-1', truckId: 'truck-1', body: {} }))
      expect(result.error).toBeDefined()
    })
  })

  describe('getDriverRevenue', () => {
    it('[URL] GET driver/:driverId/revenue with multi-filters', async () => {
      mockFetchResponse({
        status: 200,
        body: {
          totalRevenue: 1000, totalExpenses: 500, netProfit: 500, profitMargin: 0.5,
          totalDistanceKm: 970, completedLoadsCount: 1, monthlyFixedCosts: 0,
          loadBreakdown: [], expensePreferences: {},
        },
      })
      const store = createTestStore()
      const filters = {
        dateRange: { from: '2024-01-01T00:00:00Z', to: '2024-02-01T00:00:00Z' },
        status: 'delivered',
        truckType: 'Dry Van',
        selectedTruck: 'truck-1',
        minPayout: 100,
        maxPayout: 2000,
        origin: 'Calgary',
        destination: 'Vancouver',
        minDistance: 50,
        maxDistance: 2000,
      }
      await store.dispatch(driverApi.endpoints.getDriverRevenue.initiate({ driverId: 'driver-1', filters }))
      const url = lastCall().url
      expect(url).toContain('/api/driver/driver-1/revenue?')
      expect(url).toContain('dateFrom=2024-01-01')
      expect(url).toContain('dateTo=2024-02-01')
      expect(url).toContain('status=delivered')
      expect(url).toContain('truckType=Dry+Van')
      expect(url).toContain('selectedTruck=truck-1')
      expect(url).toContain('minPayout=100')
      expect(url).toContain('maxPayout=2000')
      expect(url).toContain('origin=Calgary')
      expect(url).toContain('destination=Vancouver')
      expect(url).toContain('minDistance=50')
      expect(url).toContain('maxDistance=2000')
      expect(lastCall().method).toBe('GET')
    })

    it('[Success] data lands in cache', async () => {
      mockFetchResponse({
        status: 200,
        body: {
          totalRevenue: 1000, totalExpenses: 500, netProfit: 500, profitMargin: 0.5,
          totalDistanceKm: 970, completedLoadsCount: 1, monthlyFixedCosts: 0,
          loadBreakdown: [], expensePreferences: {},
        },
      })
      const store = createTestStore()
      await store.dispatch(driverApi.endpoints.getDriverRevenue.initiate({ driverId: 'driver-1' }))
      const state = driverApi.endpoints.getDriverRevenue.select({ driverId: 'driver-1' })(store.getState())
      expect(state.data?.totalRevenue).toBe(1000)
    })

    it('[Error] 500 sets error state', async () => {
      mockFetchResponse({ status: 500, body: {} })
      const store = createTestStore()
      await store.dispatch(driverApi.endpoints.getDriverRevenue.initiate({ driverId: 'driver-1' }))
      const state = driverApi.endpoints.getDriverRevenue.select({ driverId: 'driver-1' })(store.getState())
      expect(state.isError).toBe(true)
    })
  })

  describe('updateDriverExpenses', () => {
    it('[URL/Body] PATCH driver/:driverId/expenses', async () => {
      mockFetchResponse({ status: 200, body: fixtures.driverProfile() })
      const store = createTestStore()
      const payload = { fuelCostPerLiter: 1.6, fuelEfficiencyKmPerLiter: 3.5 }
      await store.dispatch(driverApi.endpoints.updateDriverExpenses.initiate({ driverId: 'driver-1', body: payload }))
      expect(lastCall().url).toContain('/api/driver/driver-1/expenses')
      expect(lastCall().method).toBe('PATCH')
      expect(lastCall().body).toEqual(payload)
    })

    it('[Success] data in result', async () => {
      mockFetchResponse({ status: 200, body: fixtures.driverProfile() })
      const store = createTestStore()
      const result = await store.dispatch(driverApi.endpoints.updateDriverExpenses.initiate({ driverId: 'driver-1', body: {} }))
      expect(result.data?._id).toBe('driver-1')
    })

    it('[Error] 400 sets error', async () => {
      mockFetchResponse({ status: 400, body: {} })
      const store = createTestStore()
      const result = await store.dispatch(driverApi.endpoints.updateDriverExpenses.initiate({ driverId: 'driver-1', body: {} }))
      expect(result.error).toBeDefined()
    })
  })

  describe('selectTruckForLoad', () => {
    it('[URL/Body] PATCH loads/:loadId/select-truck with truckId', async () => {
      mockFetchResponse({ status: 200, body: fixtures.load() })
      const store = createTestStore()
      await store.dispatch(driverApi.endpoints.selectTruckForLoad.initiate({ loadId: 'load-1', truckId: 'truck-1' }))
      expect(lastCall().url).toContain('/api/loads/load-1/select-truck')
      expect(lastCall().method).toBe('PATCH')
      expect(lastCall().body).toEqual({ truckId: 'truck-1' })
    })

    it('[Success] data in result', async () => {
      mockFetchResponse({ status: 200, body: fixtures.load() })
      const store = createTestStore()
      const result = await store.dispatch(driverApi.endpoints.selectTruckForLoad.initiate({ loadId: 'load-1', truckId: null }))
      expect(result.data?._id).toBe('load-1')
    })

    it('[Error] 404 sets error', async () => {
      mockFetchResponse({ status: 404, body: {} })
      const store = createTestStore()
      const result = await store.dispatch(driverApi.endpoints.selectTruckForLoad.initiate({ loadId: 'load-1', truckId: 'truck-1' }))
      expect(result.error).toBeDefined()
    })
  })

  describe('uploadDriverDocuments', () => {
    it('[queryFn] presign + S3 PUT produces uploaded docs', async () => {
      mockFetchResponse((url, _options) => {
        if (url.includes('/api/uploads/presign')) {
          return { status: 200, body: { uploadUrl: 'http://s3/upload-1', key: 'key-1', fileUrl: 'http://s3/file-1' } }
        }
        return { status: 200, body: {} }
      })
      const store = createTestStore()
      const file = new File(['data'], 'license.pdf', { type: 'application/pdf' })
      const result = await store.dispatch(
        driverApi.endpoints.uploadDriverDocuments.initiate({ driverId: 'driver-1', docType: 'driverDocuments', files: [file] })
      )
      expect(result.data).toEqual([{ name: 'license.pdf', url: 'http://s3/file-1', key: 'key-1' }])
    })

    it('[queryFn] presign request posts firebaseUid + docType', async () => {
      mockFetchResponse((url, _options) => {
        if (url.includes('/api/uploads/presign')) {
          return { status: 200, body: { uploadUrl: 'http://s3/u', key: 'k', fileUrl: 'http://s3/f' } }
        }
        return { status: 200, body: {} }
      })
      const store = createTestStore()
      const file = new File(['data'], 'license.pdf', { type: 'application/pdf' })
      await store.dispatch(
        driverApi.endpoints.uploadDriverDocuments.initiate({ driverId: 'driver-1', docType: 'driverDocuments', files: [file] })
      )
      const presign = getFetchCalls().find((c) => c.url.includes('/api/uploads/presign'))
      expect(presign?.method).toBe('POST')
      expect(presign?.body).toMatchObject({ firebaseUid: 'test-uid', docType: 'driverDocuments', fileName: 'license.pdf' })
    })
  })

  describe('removeCertificationDocument', () => {
    it('[URL] DELETE driver/:driverId/documents/:docKey (encoded)', async () => {
      mockFetchResponse({ status: 200, body: {} })
      const store = createTestStore()
      await store.dispatch(driverApi.endpoints.removeCertificationDocument.initiate({ driverId: 'driver-1', docKey: 'folder/my-doc.pdf' }))
      expect(lastCall().url).toContain('/api/driver/driver-1/documents/folder%2Fmy-doc.pdf')
      expect(lastCall().method).toBe('DELETE')
    })

    it('[Success] resolves', async () => {
      mockFetchResponse({ status: 200, body: {} })
      const store = createTestStore()
      const result = await store.dispatch(driverApi.endpoints.removeCertificationDocument.initiate({ driverId: 'driver-1', docKey: 'k' }))
      expect(result.data).toBeDefined()
    })

    it('[Error] 404 sets error', async () => {
      mockFetchResponse({ status: 404, body: {} })
      const store = createTestStore()
      const result = await store.dispatch(driverApi.endpoints.removeCertificationDocument.initiate({ driverId: 'driver-1', docKey: 'k' }))
      expect(result.error).toBeDefined()
    })
  })

  describe('removeInsuranceCertificate', () => {
    it('[URL] DELETE driver/:driverId/insurance/:idx', async () => {
      mockFetchResponse({ status: 200, body: {} })
      const store = createTestStore()
      await store.dispatch(driverApi.endpoints.removeInsuranceCertificate.initiate({ driverId: 'driver-1', idx: 0 }))
      expect(lastCall().url).toContain('/api/driver/driver-1/insurance/0')
      expect(lastCall().method).toBe('DELETE')
    })

    it('[Success] resolves', async () => {
      mockFetchResponse({ status: 200, body: {} })
      const store = createTestStore()
      const result = await store.dispatch(driverApi.endpoints.removeInsuranceCertificate.initiate({ driverId: 'driver-1', idx: 1 }))
      expect(result.data).toBeDefined()
    })

    it('[Error] 404 sets error', async () => {
      mockFetchResponse({ status: 404, body: {} })
      const store = createTestStore()
      const result = await store.dispatch(driverApi.endpoints.removeInsuranceCertificate.initiate({ driverId: 'driver-1', idx: 1 }))
      expect(result.error).toBeDefined()
    })
  })
})
