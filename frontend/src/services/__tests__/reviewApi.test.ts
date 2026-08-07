import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  createTestStore,
  seedToken,
  restoreFetch,
  mockFetchResponse,
  getFetchCalls,
  resetFetchCalls,
} from './helpers'
import { reviewApi } from '../reviewApi/reviewSlice'
import { __setCachedTokenForTests } from '../api'

function lastCall() {
  const calls = getFetchCalls()
  return calls[calls.length - 1]
}

function review(overrides: Record<string, unknown> = {}) {
  return {
    _id: 'review-1',
    reviewerId: { _id: 'company-1', name: 'Test Company', email: 'co@test.com' },
    targetId: { _id: 'driver-1', name: 'Test Driver', email: 'dr@test.com' },
    loadId: { originAddress: 'Calgary, AB', destinationAddress: 'Vancouver, BC' },
    ratingCategories: { communication: 5, reliability: 5, professionalism: 5 },
    comment: 'Great driver',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('reviewApi endpoints', () => {
  beforeEach(() => {
    resetFetchCalls()
    __setCachedTokenForTests(null)
  })

  afterEach(() => {
    restoreFetch()
  })

  describe('getReviewsForTarget', () => {
    it('[URL/Query] GET reviews/target/:targetId with page/limit', async () => {
      mockFetchResponse({
        status: 200,
        body: { data: [review()], pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } },
      })
      const store = createTestStore()
      await store.dispatch(reviewApi.endpoints.getReviewsForTarget.initiate({ targetId: 'driver-1', page: 1, limit: 20 }))
      expect(lastCall().url).toContain('/api/reviews/target/driver-1')
      expect(lastCall().url).toContain('page=1')
      expect(lastCall().url).toContain('limit=20')
      expect(lastCall().method).toBe('GET')
    })

    it('[URL] GET reviews/target/:targetId without optional params', async () => {
      mockFetchResponse({
        status: 200,
        body: { data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } },
      })
      const store = createTestStore()
      await store.dispatch(reviewApi.endpoints.getReviewsForTarget.initiate({ targetId: 'driver-1' }))
      expect(lastCall().url).toContain('/api/reviews/target/driver-1')
      expect(lastCall().url).not.toContain('page=')
    })

    it('[Headers] Authorization present when token cached', async () => {
      await seedToken('review-token')
      mockFetchResponse({
        status: 200,
        body: { data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } },
      })
      const store = createTestStore()
      await store.dispatch(reviewApi.endpoints.getReviewsForTarget.initiate({ targetId: 'driver-1' }))
      expect(lastCall().headers['authorization']).toBe('Bearer review-token')
    })

    it('[Success] data lands in cache', async () => {
      mockFetchResponse({
        status: 200,
        body: { data: [review()], pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } },
      })
      const store = createTestStore()
      const args = { targetId: 'driver-1', page: 1, limit: 20 }
      await store.dispatch(reviewApi.endpoints.getReviewsForTarget.initiate(args))
      const state = reviewApi.endpoints.getReviewsForTarget.select(args)(store.getState())
      expect(state.data?.data).toHaveLength(1)
      expect(state.data?.pagination.total).toBe(1)
    })

    it('[Error] 500 sets error state', async () => {
      mockFetchResponse({ status: 500, body: {} })
      const store = createTestStore()
      const args = { targetId: 'driver-1' }
      await store.dispatch(reviewApi.endpoints.getReviewsForTarget.initiate(args))
      const state = reviewApi.endpoints.getReviewsForTarget.select(args)(store.getState())
      expect(state.isError).toBe(true)
    })
  })

  describe('createReview', () => {
    it('[URL/Body] POST reviews with payload', async () => {
      mockFetchResponse({ status: 201, body: review() })
      const store = createTestStore()
      const payload = {
        reviewerId: 'company-1',
        targetId: 'driver-1',
        loadId: 'load-1',
        ratingCategories: {
          timeliness: 5,
          communication: 5,
          reliability: 5,
          professionalism: 5,
          documentationAccuracy: 5,
        },
        comment: 'Great driver',
        targetType: 'driver' as const,
      }
      await store.dispatch(reviewApi.endpoints.createReview.initiate(payload))
      expect(lastCall().url).toContain('/api/reviews')
      expect(lastCall().method).toBe('POST')
      expect(lastCall().body).toEqual(payload)
    })

    it('[Success] data in result', async () => {
      mockFetchResponse({ status: 201, body: review() })
      const store = createTestStore()
      const result = await store.dispatch(
        reviewApi.endpoints.createReview.initiate({
          reviewerId: 'company-1',
          targetId: 'driver-1',
          loadId: 'load-1',
          ratingCategories: {
          timeliness: 5,
          communication: 5,
          reliability: 5,
          professionalism: 5,
          documentationAccuracy: 5,
        },
        })
      )
      expect((result.data as { _id: string } | undefined)?._id).toBe('review-1')
    })

    it('[Error] 400 sets error', async () => {
      mockFetchResponse({ status: 400, body: { message: 'Invalid review' } })
      const store = createTestStore()
      const result = await store.dispatch(
        reviewApi.endpoints.createReview.initiate({
          reviewerId: 'company-1',
          targetId: 'driver-1',
          loadId: 'load-1',
          ratingCategories: {
          timeliness: 5,
          communication: 5,
          reliability: 5,
          professionalism: 5,
          documentationAccuracy: 5,
        },
        })
      )
      expect(result.error).toBeDefined()
    })
  })
})