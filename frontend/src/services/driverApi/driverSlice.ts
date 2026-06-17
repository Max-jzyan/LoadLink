import { api } from '../api'
import { LoadTag, LoadTagId } from '../apiTypes'
import type { Load } from '../loadApi/loadEnum'
import type { PlaceBidPayload, ClaimLoadPayload, ClaimResult, Bid, Truck } from './driverEnum'

export const driverApi = api.injectEndpoints({
  endpoints: (build) => ({
    // POST /api/auctions/:loadId/bids — place a driver bid
    placeBid: build.mutation<Bid, { loadId: string; body: PlaceBidPayload }>({
      query: ({ loadId, body }) => ({
        url: `auctions/${loadId}/bids`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { loadId }) => [
        { type: LoadTag.Bid, id: loadId },
        { type: LoadTag.AuctionPrice, id: loadId },
      ],
    }),

    // POST /api/auctions/:loadId/claim — claim a load at current price
    claimLoad: build.mutation<ClaimResult, { loadId: string; body: ClaimLoadPayload }>({
      query: ({ loadId, body }) => ({
        url: `auctions/${loadId}/claim`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { loadId }) => [
        { type: LoadTag.Load, id: loadId },
        { type: LoadTag.Bid, id: loadId },
        { type: LoadTag.AuctionPrice, id: loadId },
        { type: LoadTag.Load, id: LoadTagId.DriverList },
      ],
    }),

    // GET /api/driver/:driverId/bids — list driver's bids
    listDriverBids: build.query<Bid[], { driverId: string; status?: string }>({
      query: ({ driverId, status }) => {
        const params = status ? `?status=${status}` : ''
        return `driver/${driverId}/bids${params}`
      },
      providesTags: (_result, _error, { driverId }) => [{ type: LoadTag.Bid, id: driverId }],
    }),

    // GET /api/driver/:driverId/loads — list driver's assigned loads
    listDriverLoads: build.query<Load[], { driverId: string; status?: string }>({
      query: ({ driverId, status }) => {
        const params = status ? `?status=${status}` : ''
        return `driver/${driverId}/loads${params}`
      },
      providesTags: (_result, _error, { driverId }) => [
        { type: LoadTag.Load, id: LoadTagId.DriverList },
        { type: LoadTag.Load, id: driverId },
      ],
    }),

    // GET /api/driver/:driverId/recommended-loads — fetch recommended loads
    getRecommendedLoads: build.query<Load[], string>({
      query: (driverId) => `driver/${driverId}/recommended-loads`,
      providesTags: (_result, _error, driverId) => [
        { type: LoadTag.Load, id: `${driverId}-recommended` },
      ],
    }),

    // GET /api/driver/:driverId/trucks — list driver's trucks
    listDriverTrucks: build.query<Truck[], string>({
      query: (driverId) => `driver/${driverId}/trucks`,
      providesTags: (_result, _error, driverId) => [{ type: LoadTag.Truck, id: driverId }],
    }),
  }),
  overrideExisting: false,
})

// Auto-generated hooks
export const {
  usePlaceBidMutation,
  useClaimLoadMutation,
  useListDriverBidsQuery,
  useListDriverLoadsQuery,
  useGetRecommendedLoadsQuery,
  useListDriverTrucksQuery,
} = driverApi
