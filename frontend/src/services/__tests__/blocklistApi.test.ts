import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  createTestStore,
  seedToken,
  restoreFetch,
  mockFetchResponse,
  getFetchCalls,
  resetFetchCalls,
} from './helpers'
import { blocklistApi } from '../blocklistApi/blocklistSlice'
import { __setCachedTokenForTests } from '../api'

function lastCall() {
  const calls = getFetchCalls()
  return calls[calls.length - 1]
}

function blocklistEntry(overrides: Record<string, unknown> = {}) {
  return {
    _id: 'bl-1',
    userId: 'driver-1',
    targetId: { _id: 'company-1', name: 'Test Company', email: 'co@test.com', role: 'company' },
    targetType: 'company',
    reason: 'Fraud',
    blockedAt: '2026-01-01T00:00:00Z',
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function knownUser(overrides: Record<string, unknown> = {}) {
  return {
    _id: 'user-9',
    name: 'Known Contact',
    email: 'known@test.com',
    interactionType: 'bid',
    ...overrides,
  }
}

describe('blocklistApi endpoints', () => {
  beforeEach(() => {
    resetFetchCalls()
    __setCachedTokenForTests(null)
  })

  afterEach(() => {
    restoreFetch()
  })

  describe('getBlocklist', () => {
    it('[URL] GET blocklist/:userId', async () => {
      mockFetchResponse({ status: 200, body: [blocklistEntry()] })
      const store = createTestStore()
      await store.dispatch(blocklistApi.endpoints.getBlocklist.initiate('driver-1'))
      expect(lastCall().url).toContain('/api/blocklist/driver-1')
      expect(lastCall().method).toBe('GET')
    })

    it('[Headers] Authorization present when token cached', async () => {
      await seedToken('bl-token')
      mockFetchResponse({ status: 200, body: [] })
      const store = createTestStore()
      await store.dispatch(blocklistApi.endpoints.getBlocklist.initiate('driver-1'))
      expect(lastCall().headers['authorization']).toBe('Bearer bl-token')
    })

    it('[Success] data lands in cache', async () => {
      mockFetchResponse({ status: 200, body: [blocklistEntry()] })
      const store = createTestStore()
      await store.dispatch(blocklistApi.endpoints.getBlocklist.initiate('driver-1'))
      const state = blocklistApi.endpoints.getBlocklist.select('driver-1')(store.getState())
      expect(state.data).toHaveLength(1)
      expect(state.data?.[0]?.targetId?._id).toBe('company-1')
    })

    it('[Error] 500 sets error state', async () => {
      mockFetchResponse({ status: 500, body: {} })
      const store = createTestStore()
      await store.dispatch(blocklistApi.endpoints.getBlocklist.initiate('driver-1'))
      const state = blocklistApi.endpoints.getBlocklist.select('driver-1')(store.getState())
      expect(state.isError).toBe(true)
    })
  })

  describe('blockUser', () => {
    it('[URL/Body] POST blocklist/:userId with body', async () => {
      mockFetchResponse({ status: 201, body: blocklistEntry() })
      const store = createTestStore()
      const payload = { userId: 'driver-1', body: { targetName: 'Test Company', targetType: 'company' as const, reason: 'Fraud' } }
      await store.dispatch(blocklistApi.endpoints.blockUser.initiate(payload))
      expect(lastCall().url).toContain('/api/blocklist/driver-1')
      expect(lastCall().method).toBe('POST')
      expect(lastCall().body).toEqual(payload.body)
    })

    it('[Success] data in result', async () => {
      mockFetchResponse({ status: 201, body: blocklistEntry() })
      const store = createTestStore()
      const result = await store.dispatch(
        blocklistApi.endpoints.blockUser.initiate({ userId: 'driver-1', body: { targetName: 'Test Company', targetType: 'company' as const } })
      )
      expect(result.data?._id).toBe('bl-1')
    })

    it('[Error] 400 sets error', async () => {
      mockFetchResponse({ status: 400, body: { message: 'Already blocked' } })
      const store = createTestStore()
      const result = await store.dispatch(
        blocklistApi.endpoints.blockUser.initiate({ userId: 'driver-1', body: { targetName: 'Test Company', targetType: 'company' as const } })
      )
      expect(result.error).toBeDefined()
    })
  })

  describe('unblockUser', () => {
    it('[URL/Method] DELETE blocklist/:userId/:targetId', async () => {
      mockFetchResponse({ status: 200, body: {} })
      const store = createTestStore()
      await store.dispatch(blocklistApi.endpoints.unblockUser.initiate({ userId: 'driver-1', targetId: 'company-1' }))
      expect(lastCall().url).toContain('/api/blocklist/driver-1/company-1')
      expect(lastCall().method).toBe('DELETE')
    })

    it('[Success] no error', async () => {
      mockFetchResponse({ status: 200, body: {} })
      const store = createTestStore()
      const result = await store.dispatch(blocklistApi.endpoints.unblockUser.initiate({ userId: 'driver-1', targetId: 'company-1' }))
      expect(result.error).toBeUndefined()
    })

    it('[Error] 404 sets error', async () => {
      mockFetchResponse({ status: 404, body: {} })
      const store = createTestStore()
      const result = await store.dispatch(blocklistApi.endpoints.unblockUser.initiate({ userId: 'driver-1', targetId: 'company-1' }))
      expect(result.error).toBeDefined()
    })
  })

  describe('getFeedPreferences', () => {
    it('[URL] GET users/:userId/feed-preferences', async () => {
      mockFetchResponse({ status: 200, body: { hideBlocked: true, hideBelowMinimum: false } })
      const store = createTestStore()
      await store.dispatch(blocklistApi.endpoints.getFeedPreferences.initiate('driver-1'))
      expect(lastCall().url).toContain('/api/users/driver-1/feed-preferences')
      expect(lastCall().method).toBe('GET')
    })

    it('[Success] data lands in cache', async () => {
      mockFetchResponse({ status: 200, body: { hideBlocked: true, hideBelowMinimum: false } })
      const store = createTestStore()
      await store.dispatch(blocklistApi.endpoints.getFeedPreferences.initiate('driver-1'))
      const state = blocklistApi.endpoints.getFeedPreferences.select('driver-1')(store.getState())
      expect(state.data?.hideBlocked).toBe(true)
    })

    it('[Error] 401 sets error state', async () => {
      mockFetchResponse({ status: 401, body: {} })
      const store = createTestStore()
      await store.dispatch(blocklistApi.endpoints.getFeedPreferences.initiate('driver-1'))
      const state = blocklistApi.endpoints.getFeedPreferences.select('driver-1')(store.getState())
      expect(state.isError).toBe(true)
    })
  })

  describe('getKnownUsers', () => {
    it('[URL] GET blocklist/:userId/known-users', async () => {
      mockFetchResponse({ status: 200, body: [knownUser()] })
      const store = createTestStore()
      await store.dispatch(blocklistApi.endpoints.getKnownUsers.initiate('driver-1'))
      expect(lastCall().url).toContain('/api/blocklist/driver-1/known-users')
      expect(lastCall().method).toBe('GET')
    })

    it('[Success] data lands in cache', async () => {
      mockFetchResponse({ status: 200, body: [knownUser()] })
      const store = createTestStore()
      await store.dispatch(blocklistApi.endpoints.getKnownUsers.initiate('driver-1'))
      const state = blocklistApi.endpoints.getKnownUsers.select('driver-1')(store.getState())
      expect(state.data).toHaveLength(1)
      expect(state.data?.[0]?.name).toBe('Known Contact')
    })

    it('[Error] 500 sets error state', async () => {
      mockFetchResponse({ status: 500, body: {} })
      const store = createTestStore()
      await store.dispatch(blocklistApi.endpoints.getKnownUsers.initiate('driver-1'))
      const state = blocklistApi.endpoints.getKnownUsers.select('driver-1')(store.getState())
      expect(state.isError).toBe(true)
    })
  })

  describe('updateFeedPreferences', () => {
    it('[URL/Body] PATCH users/:userId/feed-preferences with body', async () => {
      mockFetchResponse({ status: 200, body: { hideBlocked: true, hideBelowMinimum: true } })
      const store = createTestStore()
      await store.dispatch(blocklistApi.endpoints.updateFeedPreferences.initiate({ userId: 'driver-1', body: { hideBlocked: true } }))
      expect(lastCall().url).toContain('/api/users/driver-1/feed-preferences')
      expect(lastCall().method).toBe('PATCH')
      expect(lastCall().body).toEqual({ hideBlocked: true })
    })

    it('[Success] data in result', async () => {
      mockFetchResponse({ status: 200, body: { hideBlocked: true, hideBelowMinimum: true } })
      const store = createTestStore()
      const result = await store.dispatch(
        blocklistApi.endpoints.updateFeedPreferences.initiate({ userId: 'driver-1', body: { hideBlocked: true } })
      )
      expect(result.data?.hideBlocked).toBe(true)
    })

    it('[Error] 500 sets error', async () => {
      mockFetchResponse({ status: 500, body: {} })
      const store = createTestStore()
      const result = await store.dispatch(
        blocklistApi.endpoints.updateFeedPreferences.initiate({ userId: 'driver-1', body: { hideBlocked: true } })
      )
      expect(result.error).toBeDefined()
    })

    it('[Optimistic] patches cache immediately on dispatch, then confirms on success', async () => {
      // fetchCalls is populated before the callback runs, so we can read the
      // current request's method via getFetchCalls().
      mockFetchResponse(() => {
        const calls = getFetchCalls()
        const method = calls[calls.length - 1]?.method ?? 'GET'
        if (method === 'GET') {
          return { status: 200, body: { hideBlocked: false, hideBelowMinimum: false, notifyReview: true } }
        }
        return { status: 200, body: { hideBlocked: true, hideBelowMinimum: false, notifyReview: true } }
      })

      const store = createTestStore()
      // Load the preferences into cache first.
      await store.dispatch(blocklistApi.endpoints.getFeedPreferences.initiate('driver-1'))
      // Dispatch update — optimistic patch applies synchronously, no need to await queryFulfilled
      // to see the cache change.
      store.dispatch(blocklistApi.endpoints.updateFeedPreferences.initiate({ userId: 'driver-1', body: { hideBlocked: true } }))
      const state = blocklistApi.endpoints.getFeedPreferences.select('driver-1')(store.getState())
      expect(state.data?.hideBlocked).toBe(true)
    })

    it('[Optimistic] undoes the patch when the mutation fails', async () => {
      const original = { hideBlocked: false, hideBelowMinimum: false, notifyReview: true }
      mockFetchResponse(() => {
        const calls = getFetchCalls()
        const method = calls[calls.length - 1]?.method ?? 'GET'
        if (method === 'GET') {
          return { status: 200, body: original }
        }
        return { status: 500, body: { message: 'Failed' } }
      })

      const store = createTestStore()
      // Load the preferences into cache first.
      await store.dispatch(blocklistApi.endpoints.getFeedPreferences.initiate('driver-1'))
      // Dispatch update — it will fail, so the optimistic patch should be undone.
      await store.dispatch(blocklistApi.endpoints.updateFeedPreferences.initiate({ userId: 'driver-1', body: { hideBlocked: true, hideBelowMinimum: true, notifyReview: false } }))
      const state = blocklistApi.endpoints.getFeedPreferences.select('driver-1')(store.getState())
      expect(state.data?.hideBlocked).toBe(false)
      expect(state.data?.hideBelowMinimum).toBe(false)
      expect(state.data?.notifyReview).toBe(true)
    })
  })
})