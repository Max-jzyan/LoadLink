import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  createTestStore,
  mockFetchResponse,
  getFetchCalls,
  resetFetchCalls,
  restoreFetch,
  fixtures,
} from './helpers'
import { trailerApi } from '../trailerApi/trailerSlice'
import { __setCachedTokenForTests } from '../api'

function lastCall() {
  const calls = getFetchCalls()
  return calls[calls.length - 1]
}

describe('trailerApi endpoints', () => {
  beforeEach(() => {
    resetFetchCalls()
    __setCachedTokenForTests(null)
  })

  afterEach(() => {
    restoreFetch()
  })

  describe('listDriverTrailers', () => {
    it('[URL] GET driver/:driverId/trailers', async () => {
      mockFetchResponse({ status: 200, body: [] })
      const store = createTestStore()
      await store.dispatch(trailerApi.endpoints.listDriverTrailers.initiate('driver-1'))
      expect(lastCall().url).toContain('/api/driver/driver-1/trailers')
      expect(lastCall().method).toBe('GET')
    })

    it('[Success] data lands in cache', async () => {
      mockFetchResponse({ status: 200, body: [fixtures.trailer()] })
      const store = createTestStore()
      await store.dispatch(trailerApi.endpoints.listDriverTrailers.initiate('driver-1'))
      const state = trailerApi.endpoints.listDriverTrailers.select('driver-1')(store.getState())
      expect(state.data).toHaveLength(1)
    })

    it('[Error] 500 sets error state', async () => {
      mockFetchResponse({ status: 500, body: {} })
      const store = createTestStore()
      await store.dispatch(trailerApi.endpoints.listDriverTrailers.initiate('driver-1'))
      const state = trailerApi.endpoints.listDriverTrailers.select('driver-1')(store.getState())
      expect(state.isError).toBe(true)
    })
  })

  describe('createTrailer', () => {
    it('[URL/Body] POST driver/:driverId/trailers with payload', async () => {
      mockFetchResponse({ status: 201, body: fixtures.trailer() })
      const store = createTestStore()
      const payload = { plateNumber: 'TRAILER1', trailerType: 'Dry Van', lengthFt: 53 }
      await store.dispatch(trailerApi.endpoints.createTrailer.initiate({ driverId: 'driver-1', body: payload }))
      expect(lastCall().url).toContain('/api/driver/driver-1/trailers')
      expect(lastCall().method).toBe('POST')
      expect(lastCall().body).toEqual(payload)
    })

    it('[Success] data in result', async () => {
      mockFetchResponse({ status: 201, body: fixtures.trailer() })
      const store = createTestStore()
      const result = await store.dispatch(trailerApi.endpoints.createTrailer.initiate({ driverId: 'driver-1', body: {} as never }))
      expect(result.data?._id).toBe('trailer-1')
    })

    it('[Error] 400 sets error', async () => {
      mockFetchResponse({ status: 400, body: {} })
      const store = createTestStore()
      const result = await store.dispatch(trailerApi.endpoints.createTrailer.initiate({ driverId: 'driver-1', body: {} as never }))
      expect(result.error).toBeDefined()
    })
  })

  describe('updateTrailer', () => {
    it('[URL/Body] PATCH driver/:driverId/trailers/:trailerId with payload', async () => {
      mockFetchResponse({ status: 200, body: fixtures.trailer() })
      const store = createTestStore()
      const payload = { trailerType: 'Reefer' }
      await store.dispatch(trailerApi.endpoints.updateTrailer.initiate({ driverId: 'driver-1', trailerId: 'trailer-1', body: payload }))
      expect(lastCall().url).toContain('/api/driver/driver-1/trailers/trailer-1')
      expect(lastCall().method).toBe('PATCH')
      expect(lastCall().body).toEqual(payload)
    })

    it('[Success] data in result', async () => {
      mockFetchResponse({ status: 200, body: fixtures.trailer() })
      const store = createTestStore()
      const result = await store.dispatch(trailerApi.endpoints.updateTrailer.initiate({ driverId: 'driver-1', trailerId: 'trailer-1', body: {} }))
      expect(result.data?._id).toBe('trailer-1')
    })

    it('[Error] 404 sets error', async () => {
      mockFetchResponse({ status: 404, body: {} })
      const store = createTestStore()
      const result = await store.dispatch(trailerApi.endpoints.updateTrailer.initiate({ driverId: 'driver-1', trailerId: 'trailer-1', body: {} }))
      expect(result.error).toBeDefined()
    })
  })

  describe('deleteTrailer', () => {
    it('[URL] DELETE driver/:driverId/trailers/:trailerId', async () => {
      mockFetchResponse({ status: 200, body: {} })
      const store = createTestStore()
      await store.dispatch(trailerApi.endpoints.deleteTrailer.initiate({ driverId: 'driver-1', trailerId: 'trailer-1' }))
      expect(lastCall().url).toContain('/api/driver/driver-1/trailers/trailer-1')
      expect(lastCall().method).toBe('DELETE')
    })

    it('[Success] resolves', async () => {
      mockFetchResponse({ status: 200, body: {} })
      const store = createTestStore()
      const result = await store.dispatch(trailerApi.endpoints.deleteTrailer.initiate({ driverId: 'driver-1', trailerId: 'trailer-1' }))
      expect(result.data).toBeDefined()
    })

    it('[Error] 404 sets error', async () => {
      mockFetchResponse({ status: 404, body: {} })
      const store = createTestStore()
      const result = await store.dispatch(trailerApi.endpoints.deleteTrailer.initiate({ driverId: 'driver-1', trailerId: 'trailer-1' }))
      expect(result.error).toBeDefined()
    })
  })
})