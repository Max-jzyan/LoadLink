import { api } from '../api'
import { LoadTag } from '../apiTypes'
import type { Trailer, CreateTrailerPayload, UpdateTrailerPayload } from '../driverApi/driverEnum'

export const trailerApi = api.injectEndpoints({
  endpoints: (build) => ({
    listDriverTrailers: build.query<Trailer[], string>({
      query: (driverId) => `driver/${driverId}/trailers`,
      providesTags: (_r, _e, driverId) => [{ type: LoadTag.Trailer, id: driverId }],
    }),

    createTrailer: build.mutation<Trailer, { driverId: string; body: CreateTrailerPayload }>({
      query: ({ driverId, body }) => ({
        url: `driver/${driverId}/trailers`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_r, _e, { driverId }) => [{ type: LoadTag.Trailer, id: driverId }],
    }),

    updateTrailer: build.mutation<
      Trailer,
      { driverId: string; trailerId: string; body: UpdateTrailerPayload }
    >({
      query: ({ driverId, trailerId, body }) => ({
        url: `driver/${driverId}/trailers/${trailerId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_r, _e, { driverId }) => [{ type: LoadTag.Trailer, id: driverId }],
    }),

    deleteTrailer: build.mutation<void, { driverId: string; trailerId: string }>({
      query: ({ driverId, trailerId }) => ({
        url: `driver/${driverId}/trailers/${trailerId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_r, _e, { driverId }) => [{ type: LoadTag.Trailer, id: driverId }],
    }),
  }),
})

export const {
  useListDriverTrailersQuery,
  useCreateTrailerMutation,
  useUpdateTrailerMutation,
  useDeleteTrailerMutation,
} = trailerApi
