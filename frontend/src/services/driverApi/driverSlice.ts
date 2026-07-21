import { getHttpErrorMessage, showError, showSuccess, getErrorStatus } from '@/lib/toast'
import { api } from '../api'
import { LoadTag, LoadTagId } from '../apiTypes'
import type { TagDescription } from '../apiTypes'
import type { Load } from '../loadApi/loadEnum'
import type {
  PlaceBidPayload,
  ClaimLoadPayload,
  ClaimResult,
  Bid,
  Truck,
  TruckExpensePreferences,
  DriverProfile,
  RevenueSummary,
  ExpensePreferences,
  ScoredLoad,
  CreateTruckPayload,
  UpdateTruckPayload,
  UpdateDriverProfilePayload,
  RevenueFiltersQuery,
  AiInsightsResult,
  AiFuelStopsResult,
  AiRestAreasResult,
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
      invalidatesTags: (_result, _error, { loadId, body }): TagDescription[] => {
        const tags: TagDescription[] = [
          { type: LoadTag.Bid, id: loadId },
          { type: LoadTag.AuctionPrice, id: loadId },
        ]
        if (body?.driverId) {
          tags.push({ type: LoadTag.Load, id: `${body.driverId}-scored` })
        }
        return tags
      },
      async onQueryStarted(_arg, { queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          const bidAmount = typeof data.amount === 'number' ? data.amount.toFixed(2) : '0.00'
          showSuccess(`Bid placed successfully for $${bidAmount}`)
        } catch (error) {
          const status = getErrorStatus(error)
          showError(getHttpErrorMessage(status))
        }
      },
    }),

    // POST /api/auctions/:loadId/claim — claim a load at current price
    claimLoad: build.mutation<ClaimResult, { loadId: string; body: ClaimLoadPayload }>({
      query: ({ loadId, body }) => ({
        url: `auctions/${loadId}/claim`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (result): TagDescription[] => {
        const tags: TagDescription[] = [
          { type: LoadTag.Load, id: result?.loadId },
          { type: LoadTag.Bid, id: result?.loadId },
          { type: LoadTag.AuctionPrice, id: result?.loadId },
          { type: LoadTag.Load, id: LoadTagId.DriverList },
        ]
        if (result?.driverId) {
          tags.push({ type: LoadTag.Driver, id: `${result.driverId}-revenue` })
          tags.push({ type: LoadTag.Load, id: `${result.driverId}-scored` })
        }
        return tags
      },
      async onQueryStarted(_arg, { queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          const payout = typeof data.finalPayout === 'number' ? data.finalPayout.toFixed(2) : '0.00'
          showSuccess(
            `Load claimed for $${payout}. Check your notifications for the rate confirmation.`
          )
        } catch (error) {
          const status = getErrorStatus(error)
          showError(getHttpErrorMessage(status))
        }
      },
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

    // GET /api/driver/:driverId/loads/scored — fetch all loads with eligibility + score.
    // Optional lat/lng (e.g. from the browser's Geolocation API) override the
    // inferred current location for deadhead/proximity scoring.
    getScoredLoads: build.query<
      ScoredLoad[],
      string | { driverId: string; lat?: number; lng?: number }
    >({
      query: (arg) => {
        const { driverId, lat, lng } = typeof arg === 'string' ? { driverId: arg } : arg
        const params = new URLSearchParams()
        if (lat !== undefined && lng !== undefined) {
          params.set('lat', String(lat))
          params.set('lng', String(lng))
        }
        const qs = params.toString()
        return `driver/${driverId}/loads/scored${qs ? `?${qs}` : ''}`
      },
      providesTags: (_result, _error, arg) => {
        const driverId = typeof arg === 'string' ? arg : arg.driverId
        return [{ type: LoadTag.Load, id: `${driverId}-scored` }]
      },
    }),

    // GET /api/ai/status — unauthenticated; returns whether OpenRouter key is configured
    // Used to conditionally render the sparkles button in the UI.
    getAiStatus: build.query<{ openrouterConfigured: boolean; model: string }, void>({
      query: () => 'ai/status',
    }),

    // GET /api/driver/:driverId/ai-insights — AI commentary on top scored loads
    // Returns { available: false } when OPENROUTER_API_KEY is absent — the UI hides gracefully.
    getAiInsights: build.query<AiInsightsResult, string>({
      query: (driverId) => `driver/${driverId}/ai-insights`,
      providesTags: (_result, _error, driverId) => [
        { type: LoadTag.Load, id: `${driverId}-ai-insights` },
      ],
    }),

    // GET /api/driver/:driverId/ai-insights/fuel-stops?loadId=<id>
    // AI-suggested fuel stop cities for a specific load route.
    getAiFuelStops: build.query<AiFuelStopsResult, { driverId: string; loadId: string }>({
      query: ({ driverId, loadId }) => `driver/${driverId}/ai-insights/fuel-stops?loadId=${loadId}`,
      providesTags: (_result, _error, { loadId }) => [
        { type: LoadTag.Load, id: `fuel-stops-${loadId}` },
      ],
    }),

    // GET /api/driver/:driverId/ai-insights/rest-areas?loadId=<id>
    // AI-suggested truck rest area stops for a specific load route.
    getAiRestAreas: build.query<AiRestAreasResult, { driverId: string; loadId: string }>({
      query: ({ driverId, loadId }) => `driver/${driverId}/ai-insights/rest-areas?loadId=${loadId}`,
      providesTags: (_result, _error, { loadId }) => [
        { type: LoadTag.Load, id: `rest-areas-${loadId}` },
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

    // GET /api/driver/:driverId/completed-loads/:companyId — list completed loads eligible for review
    listDriverCompletedLoadsForCompany: build.query<
      Load[],
      { driverId: string; companyId: string }
    >({
      query: ({ driverId, companyId }) => `driver/${driverId}/completed-loads/${companyId}`,
      providesTags: (_result, _error, { driverId }) => [
        { type: LoadTag.Load, id: `${driverId}-completed` },
      ],
    }),

    // PATCH /api/driver/:driverId/profile — update driver profile fields
    updateDriverProfile: build.mutation<
      DriverProfile,
      { driverId: string; body: UpdateDriverProfilePayload }
    >({
      query: ({ driverId, body }) => ({
        url: `driver/${driverId}/profile`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { driverId }) => [
        { type: LoadTag.Driver, id: driverId },
        { type: LoadTag.Profile, id: 'ME' },
        { type: LoadTag.Load, id: `${driverId}-scored` },
      ],
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
        { type: LoadTag.Load, id: `${driverId}-scored` },
      ],
    }),

    // PATCH /api/driver/:driverId/trucks/:truckId — update a truck
    updateTruck: build.mutation<
      Truck,
      { driverId: string; truckId: string; body: UpdateTruckPayload }
    >({
      query: ({ driverId, truckId, body }) => ({
        url: `driver/${driverId}/trucks/${truckId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { driverId }) => [
        { type: LoadTag.Driver, id: driverId },
        { type: LoadTag.Truck, id: driverId },
        { type: LoadTag.Load, id: `${driverId}-scored` },
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
        { type: LoadTag.Load, id: `${driverId}-scored` },
      ],
    }),

    // PATCH /api/driver/:driverId/trucks/:truckId/expenses — update a truck's expense preferences
    updateTruckExpenses: build.mutation<
      Truck,
      { driverId: string; truckId: string; body: Partial<TruckExpensePreferences> }
    >({
      query: ({ driverId, truckId, body }) => ({
        url: `driver/${driverId}/trucks/${truckId}/expenses`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { driverId }) => [
        { type: LoadTag.Driver, id: `${driverId}-revenue` },
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

        if (filters?.status) params.set('status', filters.status)
        if (filters?.truckType) params.set('truckType', filters.truckType)
        if (filters?.selectedTruck) params.set('selectedTruck', filters.selectedTruck)
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
    updateDriverExpenses: build.mutation<
      DriverProfile,
      { driverId: string; body: Partial<ExpensePreferences> }
    >({
      query: ({ driverId, body }) => ({
        url: `driver/${driverId}/expenses`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { driverId }) => [
        { type: LoadTag.Driver, id: driverId },
        { type: LoadTag.Driver, id: `${driverId}-revenue` },
        { type: LoadTag.Load, id: `${driverId}-scored` },
      ],
    }),

    // PATCH /api/loads/:loadId/select-truck — assign (or clear) the truck for a load
    selectTruckForLoad: build.mutation<Load, { loadId: string; truckId: string | null }>({
      query: ({ loadId, truckId }) => ({
        url: `loads/${loadId}/select-truck`,
        method: 'PATCH',
        body: { truckId },
      }),
      invalidatesTags: (result): TagDescription[] => {
        const tags: TagDescription[] = [
          { type: LoadTag.Load, id: result?._id },
          { type: LoadTag.Load, id: LoadTagId.DriverList },
        ]
        if (result?.assignedDriverId) {
          tags.push({ type: LoadTag.Driver, id: `${result.assignedDriverId}-revenue` })
          tags.push({ type: LoadTag.Load, id: `${result.assignedDriverId}-scored` })
        }
        return tags
      },
    }),

    // DELETE /api/driver/:driverId/documents/:docKey — remove a certification doc
    removeCertificationDocument: build.mutation<void, { driverId: string; docKey: string }>({
      query: ({ driverId, docKey }) => ({
        url: `driver/${driverId}/documents/${encodeURIComponent(docKey)}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_r, _e, { driverId }) => [{ type: LoadTag.Profile, id: driverId }],
    }),

    // DELETE /api/driver/:driverId/insurance/:idx — remove an insurance cert
    removeInsuranceCertificate: build.mutation<void, { driverId: string; idx: number }>({
      query: ({ driverId, idx }) => ({
        url: `driver/${driverId}/insurance/${idx}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_r, _e, { driverId }) => [{ type: LoadTag.Profile, id: driverId }],
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
  useGetScoredLoadsQuery,
  useGetAiStatusQuery,
  useGetAiInsightsQuery,
  useGetAiFuelStopsQuery,
  useGetAiRestAreasQuery,
  useListDriverTrucksQuery,
  useGetDriverProfileQuery,
  useUpdateDriverProfileMutation,
  useCreateTruckMutation,
  useUpdateTruckMutation,
  useDeleteTruckMutation,
  useGetDriverRevenueQuery,
  useUpdateDriverExpensesMutation,
  useUpdateTruckExpensesMutation,
  useSelectTruckForLoadMutation,
  useRemoveCertificationDocumentMutation,
  useRemoveInsuranceCertificateMutation,
  useListDriverCompletedLoadsForCompanyQuery,
} = driverApi
