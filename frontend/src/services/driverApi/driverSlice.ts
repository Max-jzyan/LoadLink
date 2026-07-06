import { api } from '../api'
import { LoadTag, LoadTagId } from '../apiTypes'
import type { Load } from '../loadApi/loadEnum'
import type {
  PlaceBidPayload,
  ClaimLoadPayload,
  ClaimResult,
  Bid,
  Truck,
  DriverProfile,
  RevenueSummary,
  ExpensePreferences,
  CreateTruckPayload,
  UpdateTruckPayload,
  UpdateDriverProfilePayload,
  RevenueFiltersQuery,
} from './driverEnum'

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

    // GET /api/driver/:driverId/profile — fetch full driver profile
    getDriverProfile: build.query<DriverProfile, string>({
      query: (driverId) => `driver/${driverId}/profile`,
      providesTags: (_result, _error, driverId) => [{ type: LoadTag.Driver, id: driverId }],
    }),

    // PATCH /api/driver/:driverId/profile — update driver profile fields
    updateDriverProfile: build.mutation<DriverProfile, { driverId: string; body: UpdateDriverProfilePayload }>({
      query: ({ driverId, body }) => ({
        url: `driver/${driverId}/profile`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { driverId }) => [{ type: LoadTag.Driver, id: driverId }],
    }),

    // POST /api/driver/:driverId/trucks — create a new truck
    createTruck: build.mutation<Truck, { driverId: string; body: CreateTruckPayload }>({
      query: ({ driverId, body }) => ({
        url: `driver/${driverId}/trucks`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { driverId }) => [
        { type: LoadTag.Driver, id: driverId },
        { type: LoadTag.Truck, id: driverId },
      ],
    }),

    // PATCH /api/driver/:driverId/trucks/:truckId — update a truck
    updateTruck: build.mutation<Truck, { driverId: string; truckId: string; body: UpdateTruckPayload }>({
      query: ({ driverId, truckId, body }) => ({
        url: `driver/${driverId}/trucks/${truckId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { driverId }) => [
        { type: LoadTag.Driver, id: driverId },
        { type: LoadTag.Truck, id: driverId },
      ],
    }),

    // DELETE /api/driver/:driverId/trucks/:truckId — delete a truck
    deleteTruck: build.mutation<void, { driverId: string; truckId: string }>({
      query: ({ driverId, truckId }) => ({
        url: `driver/${driverId}/trucks/${truckId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { driverId }) => [
        { type: LoadTag.Driver, id: driverId },
        { type: LoadTag.Truck, id: driverId },
      ],
    }),

  // GET /api/driver/:driverId/revenue — fetch revenue summary with optional filters
  getDriverRevenue: build.query<
    RevenueSummary,
    { driverId: string; filters?: RevenueFiltersQuery }
  >({
    query: ({ driverId, filters }) => {
      const params = new URLSearchParams()

      if (filters?.dateRange?.from) {
        params.set('dateFrom', filters.dateRange.from.split('T')[0])
      }
      if (filters?.dateRange?.to) {
        params.set('dateTo', filters.dateRange.to.split('T')[0])
      }

      if (filters?.truckType) params.set('truckType', filters.truckType)
      if (filters?.minPayout != null) params.set('minPayout', String(filters.minPayout))
      if (filters?.maxPayout != null) params.set('maxPayout', String(filters.maxPayout))
      if (filters?.origin) params.set('origin', filters.origin)
      if (filters?.destination) params.set('destination', filters.destination)
      if (filters?.minDistance != null) params.set('minDistance', String(filters.minDistance))
      if (filters?.maxDistance != null) params.set('maxDistance', String(filters.maxDistance))

      const qs = params.toString()
      return `driver/${driverId}/revenue${qs ? `?${qs}` : ''}`
    },

    providesTags: (_result, _error, { driverId }) => [
      { type: LoadTag.Driver, id: `${driverId}-revenue` },
    ],
  }),

    // PATCH /api/driver/:driverId/expenses — update expense preferences
    updateDriverExpenses: build.mutation<DriverProfile, { driverId: string; body: Partial<ExpensePreferences> }>({
      query: ({ driverId, body }) => ({
        url: `driver/${driverId}/expenses`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { driverId }) => [
        { type: LoadTag.Driver, id: driverId },
        { type: LoadTag.Driver, id: `${driverId}-revenue` },
      ],
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
  useGetDriverProfileQuery,
  useUpdateDriverProfileMutation,
  useCreateTruckMutation,
  useUpdateTruckMutation,
  useDeleteTruckMutation,
  useGetDriverRevenueQuery,
  useUpdateDriverExpensesMutation,
} = driverApi
