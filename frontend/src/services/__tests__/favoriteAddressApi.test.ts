import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  createTestStore,
  seedToken,
  restoreFetch,
  mockFetchResponse,
  getFetchCalls,
  resetFetchCalls,
} from './helpers'
import { api } from '../api'
import { favoriteAddressApi } from '../favoriteAddressApi/favoriteAddressSlice'
import { __setCachedTokenForTests } from '../api'

void favoriteAddressApi

function lastCall() {
  const calls = getFetchCalls()
  return calls[calls.length - 1]
}

function favoriteAddress(overrides: Record<string, unknown> = {}) {
  return {
    _id: 'addr-1',
    companyId: 'company-1',
    address: '123 Main St, Calgary, AB',
    lat: 51.0447,
    lng: -114.0719,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('favoriteAddressApi endpoints', () => {
  beforeEach(() => {
    resetFetchCalls()
    __setCachedTokenForTests(null)
  })

  afterEach(() => {
    restoreFetch()
  })

  describe('getFavoriteAddresses', () => {
    it('[URL] GET favorite-addresses/:companyId', async () => {
      mockFetchResponse({ status: 200, body: [favoriteAddress()] })
      const store = createTestStore()
      await store.dispatch(api.endpoints.getFavoriteAddresses.initiate('company-1'))
      expect(lastCall().url).toContain('/api/favorite-addresses/company-1')
      expect(lastCall().method).toBe('GET')
    })

    it('[Headers] Authorization present when token cached', async () => {
      await seedToken('fav-token')
      mockFetchResponse({ status: 200, body: [] })
      const store = createTestStore()
      await store.dispatch(api.endpoints.getFavoriteAddresses.initiate('company-1'))
      expect(lastCall().headers['authorization']).toBe('Bearer fav-token')
    })

    it('[Success] data lands in cache', async () => {
      mockFetchResponse({ status: 200, body: [favoriteAddress()] })
      const store = createTestStore()
      await store.dispatch(api.endpoints.getFavoriteAddresses.initiate('company-1'))
      const state = api.endpoints.getFavoriteAddresses.select('company-1')(store.getState())
      expect(state.data).toHaveLength(1)
      expect(state.data?.[0]?._id).toBe('addr-1')
    })

    it('[Error] 500 sets error state', async () => {
      mockFetchResponse({ status: 500, body: {} })
      const store = createTestStore()
      await store.dispatch(api.endpoints.getFavoriteAddresses.initiate('company-1'))
      const state = api.endpoints.getFavoriteAddresses.select('company-1')(store.getState())
      expect(state.isError).toBe(true)
    })
  })

  describe('addFavoriteAddress', () => {
    it('[URL/Body] POST favorite-addresses/:companyId with body', async () => {
      mockFetchResponse({ status: 201, body: favoriteAddress() })
      const store = createTestStore()
      const payload = {
        companyId: 'company-1',
        body: { address: '456 Oak Ave, Vancouver, BC', lat: 49.2827, lng: -123.1207 },
      }
      await store.dispatch(api.endpoints.addFavoriteAddress.initiate(payload))
      expect(lastCall().url).toContain('/api/favorite-addresses/company-1')
      expect(lastCall().method).toBe('POST')
      expect(lastCall().body).toEqual(payload.body)
    })

    it('[Success] data in result', async () => {
      mockFetchResponse({ status: 201, body: favoriteAddress() })
      const store = createTestStore()
      const result = await store.dispatch(
        api.endpoints.addFavoriteAddress.initiate({
          companyId: 'company-1',
          body: { address: '456 Oak Ave, Vancouver, BC', lat: 49.2827, lng: -123.1207 },
        })
      )
      expect(result.data?._id).toBe('addr-1')
    })

    it('[Error] 400 sets error', async () => {
      mockFetchResponse({ status: 400, body: { message: 'Invalid address' } })
      const store = createTestStore()
      const result = await store.dispatch(
        api.endpoints.addFavoriteAddress.initiate({
          companyId: 'company-1',
          body: { address: '456 Oak Ave, Vancouver, BC', lat: 49.2827, lng: -123.1207 },
        })
      )
      expect(result.error).toBeDefined()
    })
  })

  describe('deleteFavoriteAddress', () => {
    it('[URL/Method] DELETE favorite-addresses/:companyId/:addressId', async () => {
      mockFetchResponse({ status: 200, body: {} })
      const store = createTestStore()
      await store.dispatch(api.endpoints.deleteFavoriteAddress.initiate({ companyId: 'company-1', addressId: 'addr-1' }))
      expect(lastCall().url).toContain('/api/favorite-addresses/company-1/addr-1')
      expect(lastCall().method).toBe('DELETE')
    })

    it('[Success] no error', async () => {
      mockFetchResponse({ status: 200, body: {} })
      const store = createTestStore()
      const result = await store.dispatch(
        api.endpoints.deleteFavoriteAddress.initiate({ companyId: 'company-1', addressId: 'addr-1' })
      )
      expect(result.error).toBeUndefined()
    })

    it('[Error] 404 sets error', async () => {
      mockFetchResponse({ status: 404, body: {} })
      const store = createTestStore()
      const result = await store.dispatch(
        api.endpoints.deleteFavoriteAddress.initiate({ companyId: 'company-1', addressId: 'addr-1' })
      )
      expect(result.error).toBeDefined()
    })
  })
})