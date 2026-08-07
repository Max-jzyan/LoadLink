import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  createTestStore,
  seedToken,
  restoreFetch,
  mockFetchResponse,
  getFetchCalls,
  resetFetchCalls,
} from './helpers'
import { userApi } from '../userApi/userSlice'
import { __setCachedTokenForTests } from '../api'

function lastCall() {
  const calls = getFetchCalls()
  return calls[calls.length - 1]
}

describe('userApi endpoints', () => {
  beforeEach(() => {
    resetFetchCalls()
    __setCachedTokenForTests(null)
  })

  afterEach(() => {
    restoreFetch()
  })

  describe('registerUser', () => {
    it('[URL/Body] POST users/register with payload', async () => {
      mockFetchResponse({ status: 201, body: { _id: 'user-1', role: 'driver' } })
      const store = createTestStore()
      const payload = { name: 'Test Driver', email: 'test@test.com', role: 'driver' as const }
      await store.dispatch(userApi.endpoints.registerUser.initiate(payload))
      expect(lastCall().url).toContain('/api/users/register')
      expect(lastCall().method).toBe('POST')
      expect(lastCall().body).toEqual(payload)
    })

    it('[Headers] Authorization present when token cached', async () => {
      await seedToken('reg-token')
      mockFetchResponse({ status: 201, body: { _id: 'user-1', role: 'driver' } })
      const store = createTestStore()
      await store.dispatch(userApi.endpoints.registerUser.initiate({ name: 'Test', email: 't@t.com', role: 'driver' as const }))
      expect(lastCall().headers['authorization']).toBe('Bearer reg-token')
    })

    it('[Success] data in result', async () => {
      mockFetchResponse({ status: 201, body: { _id: 'user-1', role: 'driver' } })
      const store = createTestStore()
      const result = await store.dispatch(userApi.endpoints.registerUser.initiate({ name: 'Test', email: 't@t.com', role: 'driver' as const }))
      expect(result.data?._id).toBe('user-1')
      expect(result.data?.role).toBe('driver')
    })

    it('[Error] 400 sets error', async () => {
      mockFetchResponse({ status: 400, body: { message: 'Email already registered' } })
      const store = createTestStore()
      const result = await store.dispatch(userApi.endpoints.registerUser.initiate({ name: 'Test', email: 't@t.com', role: 'driver' as const }))
      expect(result.error).toBeDefined()
    })
  })

  describe('getMyProfile', () => {
    it('[URL] GET users/me/profile', async () => {
      mockFetchResponse({ status: 200, body: { _id: 'user-1', role: 'driver', name: 'Test' } })
      const store = createTestStore()
      await store.dispatch(userApi.endpoints.getMyProfile.initiate())
      expect(lastCall().url).toContain('/api/users/me/profile')
      expect(lastCall().method).toBe('GET')
    })

    it('[Headers] Authorization present when token cached', async () => {
      await seedToken('profile-token')
      mockFetchResponse({ status: 200, body: { _id: 'user-1', role: 'driver' } })
      const store = createTestStore()
      await store.dispatch(userApi.endpoints.getMyProfile.initiate())
      expect(lastCall().headers['authorization']).toBe('Bearer profile-token')
    })

    it('[Success] data lands in cache', async () => {
      mockFetchResponse({ status: 200, body: { _id: 'user-1', role: 'driver', name: 'Test' } })
      const store = createTestStore()
      await store.dispatch(userApi.endpoints.getMyProfile.initiate())
      const state = userApi.endpoints.getMyProfile.select()(store.getState())
      expect(state.data?._id).toBe('user-1')
    })

    it('[Error] 401 sets error state', async () => {
      mockFetchResponse({ status: 401, body: { message: 'Unauthorized' } })
      const store = createTestStore()
      await store.dispatch(userApi.endpoints.getMyProfile.initiate())
      const state = userApi.endpoints.getMyProfile.select()(store.getState())
      expect(state.isError).toBe(true)
    })
  })
})