import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest'
import {
  createTestStore,
  seedToken,
  restoreFetch,
  mockFetchResponse,
  getFetchCalls,
  resetFetchCalls,
} from './helpers'
import { getMockEventSources, resetMockEventSources, restoreEventSource } from '../../test/setup'
import { api } from '../api'
import { notificationApi } from '../notificationApi/notificationSlice'
import { __setCachedTokenForTests } from '../api'

void notificationApi

function lastCall() {
  const calls = getFetchCalls()
  return calls[calls.length - 1]
}

function notif(overrides: Record<string, unknown> = {}) {
  return {
    _id: 'notif-1',
    userId: 'driver-1',
    type: 'bid_accepted',
    title: 'Bid Accepted',
    message: 'Your bid was accepted',
    isRead: false,
    data: {},
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('notificationApi endpoints', () => {
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

  describe('listNotifications', () => {
    it('[URL/Query] GET notifications with page/limit/unreadOnly params', async () => {
      mockFetchResponse({ status: 200, body: { notifications: [], totalCount: 0, unreadCount: 0, page: 2, limit: 10 } })
      const store = createTestStore()
      await store.dispatch(api.endpoints.listNotifications.initiate({ page: 2, limit: 10, unreadOnly: true }))
      expect(lastCall().url).toContain('/api/notifications')
      expect(lastCall().url).toContain('page=2')
      expect(lastCall().url).toContain('limit=10')
      expect(lastCall().url).toContain('unreadOnly=true')
      expect(lastCall().method).toBe('GET')
    })

    it('[URL] GET notifications with unreadOnly=false by default', async () => {
      mockFetchResponse({ status: 200, body: { notifications: [], totalCount: 0, unreadCount: 0, page: 1, limit: 20 } })
      const store = createTestStore()
      await store.dispatch(api.endpoints.listNotifications.initiate({}))
      expect(lastCall().url).toContain('unreadOnly=false')
    })

    it('[Success] data lands in cache', async () => {
      mockFetchResponse({
        status: 200,
        body: { notifications: [notif()], totalCount: 1, unreadCount: 1, page: 1, limit: 20 },
      })
      const store = createTestStore()
      const args = { page: 1, limit: 20, unreadOnly: false }
      await store.dispatch(api.endpoints.listNotifications.initiate(args))
      const state = api.endpoints.listNotifications.select(args)(store.getState())
      expect(state.data?.notifications).toHaveLength(1)
    })

    it('[Error] 500 sets error state', async () => {
      mockFetchResponse({ status: 500, body: {} })
      const store = createTestStore()
      const args = { page: 1, limit: 20, unreadOnly: false }
      await store.dispatch(api.endpoints.listNotifications.initiate(args))
      const state = api.endpoints.listNotifications.select(args)(store.getState())
      expect(state.isError).toBe(true)
    })
  })

  describe('getUnreadCount', () => {
    it('[URL] GET notifications/unread-count', async () => {
      mockFetchResponse({ status: 200, body: { unreadCount: 3 } })
      const store = createTestStore()
      await store.dispatch(api.endpoints.getUnreadCount.initiate())
      expect(lastCall().url).toContain('/api/notifications/unread-count')
      expect(lastCall().method).toBe('GET')
    })

    it('[Success] data lands in cache', async () => {
      mockFetchResponse({ status: 200, body: { unreadCount: 3 } })
      const store = createTestStore()
      await store.dispatch(api.endpoints.getUnreadCount.initiate())
      const state = api.endpoints.getUnreadCount.select()(store.getState())
      expect(state.data?.unreadCount).toBe(3)
    })

    it('[Error] 500 sets error state', async () => {
      mockFetchResponse({ status: 500, body: {} })
      const store = createTestStore()
      await store.dispatch(api.endpoints.getUnreadCount.initiate())
      const state = api.endpoints.getUnreadCount.select()(store.getState())
      expect(state.isError).toBe(true)
    })
  })

  describe('markAsRead', () => {
    it('[URL/Method] PATCH notifications/:notificationId/read', async () => {
      mockFetchResponse({ status: 200, body: notif({ isRead: true }) })
      const store = createTestStore()
      await store.dispatch(api.endpoints.markAsRead.initiate('notif-1'))
      expect(lastCall().url).toContain('/api/notifications/notif-1/read')
      expect(lastCall().method).toBe('PATCH')
    })

    it('[Headers] Authorization present when token cached', async () => {
      await seedToken('notif-token')
      mockFetchResponse({ status: 200, body: notif({ isRead: true }) })
      const store = createTestStore()
      await store.dispatch(api.endpoints.markAsRead.initiate('notif-1'))
      expect(lastCall().headers['authorization']).toBe('Bearer notif-token')
    })

    it('[Success] data in result', async () => {
      mockFetchResponse({ status: 200, body: notif({ isRead: true }) })
      const store = createTestStore()
      const result = await store.dispatch(api.endpoints.markAsRead.initiate('notif-1'))
      expect(result.data?.isRead).toBe(true)
    })

    it('[Error] 404 sets error', async () => {
      mockFetchResponse({ status: 404, body: {} })
      const store = createTestStore()
      const result = await store.dispatch(api.endpoints.markAsRead.initiate('notif-1'))
      expect(result.error).toBeDefined()
    })
  })

  describe('markAllAsRead', () => {
    it('[URL/Method] PATCH notifications/read-all', async () => {
      mockFetchResponse({ status: 200, body: { modifiedCount: 5 } })
      const store = createTestStore()
      await store.dispatch(api.endpoints.markAllAsRead.initiate())
      expect(lastCall().url).toContain('/api/notifications/read-all')
      expect(lastCall().method).toBe('PATCH')
    })

    it('[Success] data in result', async () => {
      mockFetchResponse({ status: 200, body: { modifiedCount: 5 } })
      const store = createTestStore()
      const result = await store.dispatch(api.endpoints.markAllAsRead.initiate())
      expect(result.data?.modifiedCount).toBe(5)
    })

    it('[Error] 500 sets error', async () => {
      mockFetchResponse({ status: 500, body: {} })
      const store = createTestStore()
      const result = await store.dispatch(api.endpoints.markAllAsRead.initiate())
      expect(result.error).toBeDefined()
    })
  })

  describe('deleteNotification', () => {
    it('[URL/Method] DELETE notifications/:notificationId', async () => {
      mockFetchResponse({ status: 200, body: {} })
      const store = createTestStore()
      await store.dispatch(api.endpoints.deleteNotification.initiate('notif-1'))
      expect(lastCall().url).toContain('/api/notifications/notif-1')
      expect(lastCall().method).toBe('DELETE')
    })

    it('[Success] no error', async () => {
      mockFetchResponse({ status: 200, body: {} })
      const store = createTestStore()
      const result = await store.dispatch(api.endpoints.deleteNotification.initiate('notif-1'))
      expect(result.error).toBeUndefined()
    })

    it('[Error] 404 sets error', async () => {
      mockFetchResponse({ status: 404, body: {} })
      const store = createTestStore()
      const result = await store.dispatch(api.endpoints.deleteNotification.initiate('notif-1'))
      expect(result.error).toBeDefined()
    })
  })

  describe('streamNotifications (SSE)', () => {
    it('[SSE] opens EventSource at /api/notifications/stream with access_token', async () => {
      const store = createTestStore()
      const promise = store.dispatch(api.endpoints.streamNotifications.initiate())
      await new Promise((r) => setTimeout(r, 10))
      const ess = getMockEventSources()
      expect(ess.length).toBeGreaterThanOrEqual(1)
      const es = ess[ess.length - 1]
      expect(es.url).toContain('/api/notifications/stream')
      expect(es.url).toContain('access_token=')
      promise.unsubscribe()
      await new Promise((r) => setTimeout(r, 10))
    })

    it('[SSE] notification payload flows into cache via updateCachedData', async () => {
      const store = createTestStore()
      const promise = store.dispatch(api.endpoints.streamNotifications.initiate())
      await new Promise((r) => setTimeout(r, 10))
      const ess = getMockEventSources()
      const es = ess[ess.length - 1]
      const notifPayload = notif({ _id: 'notif-live', message: 'New bid received' })
      es.emit(notifPayload)
      await new Promise((r) => setTimeout(r, 5))
      const state = api.endpoints.streamNotifications.select()(store.getState())
      expect(state.data).toEqual(notifPayload)
      promise.unsubscribe()
      await new Promise((r) => setTimeout(r, 10))
    })

    it('[SSE] unread count payload flows into cache', async () => {
      const store = createTestStore()
      const promise = store.dispatch(api.endpoints.streamNotifications.initiate())
      await new Promise((r) => setTimeout(r, 10))
      const ess = getMockEventSources()
      const es = ess[ess.length - 1]
      const payload = { unreadCount: 7 }
      es.emit(payload)
      await new Promise((r) => setTimeout(r, 5))
      const state = api.endpoints.streamNotifications.select()(store.getState())
      expect(state.data).toEqual(payload)
      promise.unsubscribe()
      await new Promise((r) => setTimeout(r, 10))
    })

    it('[SSE] close() called on cacheEntryRemoved', async () => {
      const store = createTestStore()
      const promise = store.dispatch(api.endpoints.streamNotifications.initiate())
      await new Promise((r) => setTimeout(r, 10))
      const ess = getMockEventSources()
      const es = ess[ess.length - 1]
      promise.unsubscribe()
      await new Promise((r) => setTimeout(r, 10))
      expect(es.readyState).toBe(2)
    })
  })
})