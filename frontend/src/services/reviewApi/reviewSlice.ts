import { api } from '@/services/api';
import { type GetReviewsForTargetResponse } from './reviewEnum';

export const reviewApi = api.injectEndpoints({
  endpoints: (build) => ({
    // GET /api/reviews/target/:targetId?page=1&limit=20
    getReviewsForTarget: build.query<
      GetReviewsForTargetResponse,
      { targetId: string; page?: number; limit?: number }
    >({
      query: ({ targetId, page, limit }) => {
        const params = new URLSearchParams()
        if (page !== undefined) params.set('page', String(page))
        if (limit !== undefined) params.set('limit', String(limit))
        const qs = params.toString()
        return `reviews/target/${targetId}${qs ? `?${qs}` : ''}`
      },
    }),
  }),
  overrideExisting: false,
})

export const { useGetReviewsForTargetQuery } = reviewApi
