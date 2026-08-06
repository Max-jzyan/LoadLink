import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  createTestStore,
  createTestStoreWithAuth,
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
import type { AuthState } from '../authSlice'

// Force the loadApi endpoints to be registered (we use getLoad as the test endpoint)
void loadApi

function lastCall() {
  const calls = getFetchCalls()
  return calls[calls.length - 1]
}

describe('api base query — auth header injection & ban handling', () => {
  beforeEach(() => {
    resetFetchCalls()
    __setCachedTokenForTests(null)
  })

  afterEach(() => {
    restoreFetch()
  })

  // ── Auth header injection ───────────────────────────────────────────────────
  describe('Authorization header injection', () => {
    it('injects Bearer token when cachedToken is set', async () => {
      await seedToken('test-bearer-token')
      mockFetchResponse({ status: 200, body: fixtures.load() })
      const store = createTestStore()
      await store.dispatch(api.endpoints.getLoad.initiate('load-1'))
      expect(lastCall().headers['authorization']).toBe('Bearer test-bearer-token')
    })

    it('omits Authorization when no token is cached', async () => {
      __setCachedTokenForTests(null)
      mockFetchResponse({ status: 200, body: fixtures.load() })
      const store = createTestStore()
      await store.dispatch(api.endpoints.getLoad.initiate('load-1'))
      expect(lastCall().headers['authorization']).toBeUndefined()
    })

    it('uses baseUrl /api for all requests', async () => {
      mockFetchResponse({ status: 200, body: fixtures.load() })
      const store = createTestStore()
      await store.dispatch(api.endpoints.getLoad.initiate('load-1'))
      expect(lastCall().url).toContain('/api/loads/load-1')
    })
  })

  // ── Ban handling ───────────────────────────────────────────────────────────
  describe('ban handling (403 + ACCOUNT_BANNED)', () => {
    it('dispatches setBanReason + setSessionState(banned) on 403 ACCOUNT_BANNED', async () => {
      mockFetchResponse({ status: 403, body: { code: 'ACCOUNT_BANNED', message: 'You are banned for fraud.' } })
      const store = createTestStoreWithAuth()
      await store.dispatch(api.endpoints.getLoad.initiate('load-1'))
      // Allow the dynamic import of authSlice + dispatch to settle
      await new Promise((r) => setTimeout(r, 20))
      const authState = (store.getState() as { auth: AuthState }).auth
      expect(authState.banReason).toBe('You are banned for fraud.')
      expect(authState.sessionState).toBe('banned')
    })

    it('uses default ban message when message is absent', async () => {
      mockFetchResponse({ status: 403, body: { code: 'ACCOUNT_BANNED' } })
      const store = createTestStoreWithAuth()
      await store.dispatch(api.endpoints.getLoad.initiate('load-1'))
      await new Promise((r) => setTimeout(r, 20))
      const authState = (store.getState() as { auth: AuthState }).auth
      expect(authState.banReason).toBe('Your account has been suspended.')
      expect(authState.sessionState).toBe('banned')
    })

    it('does NOT dispatch ban actions on 403 without ACCOUNT_BANNED code', async () => {
      mockFetchResponse({ status: 403, body: { message: 'Forbidden for some other reason' } })
      const store = createTestStoreWithAuth()
      await store.dispatch(api.endpoints.getLoad.initiate('load-1'))
      await new Promise((r) => setTimeout(r, 20))
      const authState = (store.getState() as { auth: AuthState }).auth
      expect(authState.banReason).toBeNull()
      expect(authState.sessionState).not.toBe('banned')
    })

    it('does NOT dispatch ban actions on non-403 errors', async () => {
      mockFetchResponse({ status: 500, body: { code: 'ACCOUNT_BANNED', message: 'should not trigger' } })
      const store = createTestStoreWithAuth()
      await store.dispatch(api.endpoints.getLoad.initiate('load-1'))
      await new Promise((r) => setTimeout(r, 20))
      const authState = (store.getState() as { auth: AuthState }).auth
      expect(authState.banReason).toBeNull()
      expect(authState.sessionState).not.toBe('banned')
    })

    it('still surfaces the 403 error to the query cache', async () => {
      mockFetchResponse({ status: 403, body: { code: 'ACCOUNT_BANNED', message: 'banned' } })
      const store = createTestStoreWithAuth()
      await store.dispatch(api.endpoints.getLoad.initiate('load-1'))
      await new Promise((r) => setTimeout(r, 20))
      const state = api.endpoints.getLoad.select('load-1')(store.getState())
      expect(state.isError).toBe(true)
    })
  })
})