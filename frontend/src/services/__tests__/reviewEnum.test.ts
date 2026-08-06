import { describe, it, expect } from 'vitest'
import type {
  ReviewUser,
  ReviewLoad,
  Review,
  CreateReviewPayload,
  GetReviewsForTargetResponse,
} from '../reviewApi/reviewEnum'
import type { RatingCategories } from '../driverApi/driverEnum'

// reviewEnum.ts exports only TypeScript interfaces (no runtime code), so these
// tests serve as compile-time + import smoke tests and ensure the types are
// structurally correct for consumers.

describe('reviewEnum types', () => {
  const ratingCategories: RatingCategories = {
    timeliness: 5,
    communication: 5,
    reliability: 5,
    professionalism: 5,
    documentationAccuracy: 4,
  }

  it('constructs a valid ReviewUser', () => {
    const user: ReviewUser = {
      _id: 'u1',
      name: 'Test Driver',
      email: 'driver@test.com',
    }
    expect(user._id).toBe('u1')
    expect(user.email).toBe('driver@test.com')
  })

  it('constructs a valid ReviewLoad', () => {
    const load: ReviewLoad = {
      originAddress: 'Calgary, AB',
      destinationAddress: 'Vancouver, BC',
    }
    expect(load.originAddress).toBe('Calgary, AB')
    expect(load.destinationAddress).toBe('Vancouver, BC')
  })

  it('constructs a valid Review object', () => {
    const review: Review = {
      _id: 'r1',
      reviewerId: { _id: 'c1', name: 'Company', email: 'c@test.com' },
      targetId: 'd1',
      loadId: { originAddress: 'A', destinationAddress: 'B' },
      ratingCategories,
      comment: 'Great',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    }
    expect(review._id).toBe('r1')
    expect(review.ratingCategories.timeliness).toBe(5)
  })

  it('constructs a valid CreateReviewPayload', () => {
    const payload: CreateReviewPayload = {
      reviewerId: 'company-1',
      targetId: 'driver-1',
      loadId: 'load-1',
      ratingCategories,
      comment: 'Solid',
      targetType: 'driver',
    }
    expect(payload.reviewerId).toBe('company-1')
    expect(payload.targetType).toBe('driver')
  })

  it('constructs a valid GetReviewsForTargetResponse', () => {
    const response: GetReviewsForTargetResponse = {
      data: [
        {
          _id: 'r1',
          reviewerId: { _id: 'c1', name: 'Company', email: 'c@test.com' },
          targetId: 'd1',
          loadId: { originAddress: 'A', destinationAddress: 'B' },
          ratingCategories,
          comment: 'Great',
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
      ],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    }
    expect(response.pagination.total).toBe(1)
    expect(response.data).toHaveLength(1)
  })
})
