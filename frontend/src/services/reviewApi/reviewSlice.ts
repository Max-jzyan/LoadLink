import { api } from '@/services/api';
import { LoadTag } from '@/services/apiTypes';
import { type CreateReviewPayload, type GetReviewsForTargetResponse } from './reviewEnum';

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
      providesTags: (result, _error, { targetId }) =>
        result
          ? [
              ...result.data.map(({ _id }) => ({ type: LoadTag.Review, id: _id })),
              { type: LoadTag.Review, id: `TARGET_${targetId}` },
            ]
          : [{ type: LoadTag.Review, id: `TARGET_${targetId}` }],
    }),

    // POST /api/reviews
    createReview: build.mutation<unknown, CreateReviewPayload>({
      query: (body) => ({
        url: 'reviews',
        method: 'POST',
        body,
      }),
        invalidatesTags: (_result, _error, { targetId, loadId }) => [
          { type: LoadTag.Review, id: `TARGET_${targetId}` },
          { type: LoadTag.Load, id: loadId },
        ],
    }),
  }),
  overrideExisting: false,
})

export const { useGetReviewsForTargetQuery, useCreateReviewMutation } = reviewApi
