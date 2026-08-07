import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  createTestStore,
  seedToken,
  restoreFetch,
  mockFetchResponse,
  getFetchCalls,
  resetFetchCalls,
} from './helpers'
import { messageApi } from '../messageApi/messageSlice'
import { __setCachedTokenForTests } from '../api'

function lastCall() {
  const calls = getFetchCalls()
  return calls[calls.length - 1]
}

function thread(overrides: Record<string, unknown> = {}) {
  return {
    loadId: 'load-1',
    messages: [],
    counterparty: { _id: 'company-1', name: 'Test Company', role: 'company', profilePictureUrl: '' },
    ...overrides,
  }
}

function msg(overrides: Record<string, unknown> = {}) {
  return {
    _id: 'msg-1',
    loadId: 'load-1',
    senderId: 'company-1',
    recipientId: 'driver-1',
    body: 'Hello',
    isRead: false,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('messageApi endpoints', () => {
  beforeEach(() => {
    resetFetchCalls()
    __setCachedTokenForTests(null)
  })

  afterEach(() => {
    restoreFetch()
  })

  describe('getLoadThread', () => {
    it('[URL] GET loads/:loadId/messages', async () => {
      mockFetchResponse({ status: 200, body: thread() })
      const store = createTestStore()
      await store.dispatch(messageApi.endpoints.getLoadThread.initiate('load-1'))
      expect(lastCall().url).toContain('/api/loads/load-1/messages')
      expect(lastCall().method).toBe('GET')
    })

    it('[Headers] Authorization present when token cached', async () => {
      await seedToken('msg-token')
      mockFetchResponse({ status: 200, body: thread() })
      const store = createTestStore()
      await store.dispatch(messageApi.endpoints.getLoadThread.initiate('load-1'))
      expect(lastCall().headers['authorization']).toBe('Bearer msg-token')
    })

    it('[Success] data lands in cache', async () => {
      mockFetchResponse({ status: 200, body: thread({ messages: [msg()] }) })
      const store = createTestStore()
      await store.dispatch(messageApi.endpoints.getLoadThread.initiate('load-1'))
      const state = messageApi.endpoints.getLoadThread.select('load-1')(store.getState())
      expect(state.data?.loadId).toBe('load-1')
      expect(state.data?.messages).toHaveLength(1)
    })

    it('[Error] 404 sets error state', async () => {
      mockFetchResponse({ status: 404, body: {} })
      const store = createTestStore()
      await store.dispatch(messageApi.endpoints.getLoadThread.initiate('load-1'))
      const state = messageApi.endpoints.getLoadThread.select('load-1')(store.getState())
      expect(state.isError).toBe(true)
    })
  })

  describe('sendMessage', () => {
    it('[URL/Body] POST loads/:loadId/messages with body', async () => {
      mockFetchResponse({ status: 201, body: msg() })
      const store = createTestStore()
      await store.dispatch(messageApi.endpoints.sendMessage.initiate({ loadId: 'load-1', body: 'Hello driver' }))
      expect(lastCall().url).toContain('/api/loads/load-1/messages')
      expect(lastCall().method).toBe('POST')
      expect(lastCall().body).toEqual({ body: 'Hello driver' })
    })

    it('[Success] data in result', async () => {
      mockFetchResponse({ status: 201, body: msg() })
      const store = createTestStore()
      const result = await store.dispatch(messageApi.endpoints.sendMessage.initiate({ loadId: 'load-1', body: 'Hello' }))
      expect(result.data?._id).toBe('msg-1')
    })

    it('[Error] 500 sets error', async () => {
      mockFetchResponse({ status: 500, body: {} })
      const store = createTestStore()
      const result = await store.dispatch(messageApi.endpoints.sendMessage.initiate({ loadId: 'load-1', body: 'Hello' }))
      expect(result.error).toBeDefined()
    })

    it('[Cache] appends sent message to cached thread via updateQueryData', async () => {
      // fetchCalls is populated before the callback runs, so we can read the
      // current request's method via getFetchCalls().
      mockFetchResponse(() => {
        const calls = getFetchCalls()
        const method = calls[calls.length - 1]?.method ?? 'GET'
        if (method === 'GET') {
          return { status: 200, body: thread({ messages: [msg({ _id: 'msg-1', body: 'Existing' })] }) }
        }
        return { status: 201, body: msg({ _id: 'msg-2', body: 'New message' }) }
      })

      const store = createTestStore()
      // First load the thread into cache so sendMessage has something to patch.
      await store.dispatch(messageApi.endpoints.getLoadThread.initiate('load-1'))
      // Then send a message — the onQueryStarted patches the cached thread with the new message.
      await store.dispatch(messageApi.endpoints.sendMessage.initiate({ loadId: 'load-1', body: 'New message' }))
      const state = messageApi.endpoints.getLoadThread.select('load-1')(store.getState())
      expect(state.data?.messages.map((m) => m._id)).toEqual(['msg-1', 'msg-2'])
    })
  })

  describe('markThreadRead', () => {
    it('[URL/Method] PATCH loads/:loadId/messages/read', async () => {
      mockFetchResponse({ status: 200, body: { modifiedCount: 3 } })
      const store = createTestStore()
      await store.dispatch(messageApi.endpoints.markThreadRead.initiate('load-1'))
      expect(lastCall().url).toContain('/api/loads/load-1/messages/read')
      expect(lastCall().method).toBe('PATCH')
    })

    it('[Success] data in result', async () => {
      mockFetchResponse({ status: 200, body: { modifiedCount: 3 } })
      const store = createTestStore()
      const result = await store.dispatch(messageApi.endpoints.markThreadRead.initiate('load-1'))
      expect(result.data?.modifiedCount).toBe(3)
    })

    it('[Error] 404 sets error', async () => {
      mockFetchResponse({ status: 404, body: {} })
      const store = createTestStore()
      const result = await store.dispatch(messageApi.endpoints.markThreadRead.initiate('load-1'))
      expect(result.error).toBeDefined()
    })
  })

  describe('getMessageUnreadCounts', () => {
    it('[URL] GET messages/unread-counts', async () => {
      mockFetchResponse({ status: 200, body: { total: 5, byLoad: { 'load-1': 3, 'load-2': 2 } } })
      const store = createTestStore()
      await store.dispatch(messageApi.endpoints.getMessageUnreadCounts.initiate())
      expect(lastCall().url).toContain('/api/messages/unread-counts')
      expect(lastCall().method).toBe('GET')
    })

    it('[Success] data lands in cache', async () => {
      mockFetchResponse({ status: 200, body: { total: 5, byLoad: { 'load-1': 3 } } })
      const store = createTestStore()
      await store.dispatch(messageApi.endpoints.getMessageUnreadCounts.initiate())
      const state = messageApi.endpoints.getMessageUnreadCounts.select()(store.getState())
      expect(state.data?.total).toBe(5)
    })

    it('[Error] 500 sets error state', async () => {
      mockFetchResponse({ status: 500, body: {} })
      const store = createTestStore()
      await store.dispatch(messageApi.endpoints.getMessageUnreadCounts.initiate())
      const state = messageApi.endpoints.getMessageUnreadCounts.select()(store.getState())
      expect(state.isError).toBe(true)
    })
  })

  describe('listMessageThreads', () => {
    it('[URL] GET messages/threads', async () => {
      mockFetchResponse({
        status: 200,
        body: [
          {
            loadId: 'load-1',
            originAddress: 'Calgary, AB',
            destinationAddress: 'Vancouver, BC',
            loadStatus: 'in_transit',
            counterparty: { _id: 'company-1', name: 'Test Co', role: 'company', profilePictureUrl: '' },
            lastMessage: { body: 'Hi', senderId: 'company-1', createdAt: '2026-01-01T00:00:00Z' },
            unreadCount: 1,
          },
        ],
      })
      const store = createTestStore()
      await store.dispatch(messageApi.endpoints.listMessageThreads.initiate())
      expect(lastCall().url).toContain('/api/messages/threads')
      expect(lastCall().method).toBe('GET')
    })

    it('[Success] data lands in cache', async () => {
      mockFetchResponse({
        status: 200,
        body: [
          {
            loadId: 'load-1',
            originAddress: 'Calgary, AB',
            destinationAddress: 'Vancouver, BC',
            loadStatus: 'in_transit',
            counterparty: { _id: 'company-1', name: 'Test Co', role: 'company', profilePictureUrl: '' },
            lastMessage: { body: 'Hi', senderId: 'company-1', createdAt: '2026-01-01T00:00:00Z' },
            unreadCount: 1,
          },
        ],
      })
      const store = createTestStore()
      await store.dispatch(messageApi.endpoints.listMessageThreads.initiate())
      const state = messageApi.endpoints.listMessageThreads.select()(store.getState())
      expect(state.data).toHaveLength(1)
      expect(state.data?.[0]?.loadId).toBe('load-1')
    })

    it('[Error] 500 sets error state', async () => {
      mockFetchResponse({ status: 500, body: {} })
      const store = createTestStore()
      await store.dispatch(messageApi.endpoints.listMessageThreads.initiate())
      const state = messageApi.endpoints.listMessageThreads.select()(store.getState())
      expect(state.isError).toBe(true)
    })
  })
})