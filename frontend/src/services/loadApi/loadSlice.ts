import { api } from '../api'
import { LoadTag, LoadTagId } from '../apiTypes'
import type {
  CreateAuctionPayload,
  CreateLoadPayload,
  CreatedAuction,
  Load,
  PopulatedLoad,
  UpdateLoadPayload,
} from './loadEnum'
import type { ExpenseOverrideFields } from '../driverApi/driverEnum'

export const loadApi = api.injectEndpoints({
  endpoints: (build) => ({
    // GET /api/loads — list available loads (defaults to auction_live)
    listAvailableLoads: build.query<Load[], string | void>({
      query: (status) => {
        const params = status ? `?status=${status}` : ''
        return `loads${params}`
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ _id }) => ({ type: LoadTag.Load, id: _id })),
              { type: LoadTag.Load, id: LoadTagId.List },
            ]
          : [{ type: LoadTag.Load, id: LoadTagId.List }],
    }),

    // GET /api/loads/:loadId — populates companyId + auctionId, hence PopulatedLoad.
    getLoad: build.query<PopulatedLoad, string>({
      query: (loadId) => `loads/${loadId}`,
      providesTags: (_result, _error, loadId) => [{ type: LoadTag.Load, id: loadId }],
    }),

    // GET /api/company/:companyId/loads — list company loads, optionally filtered by driver and/or excluding reviewed loads
    // Accepts either a plain companyId string (legacy) or an object with optional filters
    listCompanyLoads: build.query<Load[], string | { companyId: string; assignedDriverId?: string; excludeReviewedBy?: string }>({
      query: (arg) => {
        let companyId: string
        let assignedDriverId: string | undefined
        let excludeReviewedBy: string | undefined
        if (typeof arg === 'string') {
          companyId = arg
        } else {
          companyId = arg.companyId
          assignedDriverId = arg.assignedDriverId
          excludeReviewedBy = arg.excludeReviewedBy
        }
        const params = new URLSearchParams()
        if (assignedDriverId) params.set('assignedDriverId', assignedDriverId)
        if (excludeReviewedBy) params.set('excludeReviewedBy', excludeReviewedBy)
        const qs = params.toString()
        return `company/${companyId}/loads${qs ? `?${qs}` : ''}`
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ _id }) => ({ type: LoadTag.Load, id: _id })),
              { type: LoadTag.Load, id: LoadTagId.CompanyList },
            ]
          : [{ type: LoadTag.Load, id: LoadTagId.CompanyList }],
    }),

    // POST /api/company/:companyId/loads — create a load
    createLoad: build.mutation<Load, { companyId: string; body: CreateLoadPayload }>({
      query: ({ companyId, body }) => ({
        url: `company/${companyId}/loads`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [
        { type: LoadTag.Load, id: LoadTagId.List },
        { type: LoadTag.Load, id: LoadTagId.CompanyList },
      ],
    }),

    // POST /api/auctions/:loadId — create auction for a load
    createAuction: build.mutation<CreatedAuction, { loadId: string; body: CreateAuctionPayload }>({
      query: ({ loadId, body }) => ({
        url: `auctions/${loadId}`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { loadId }) => [{ type: LoadTag.Load, id: loadId }],
    }),

    // PATCH /api/loads/:loadId — update a load
    updateLoad: build.mutation<Load, { loadId: string; body: UpdateLoadPayload }>({
      query: ({ loadId, body }) => ({
        url: `loads/${loadId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { loadId }) => [{ type: LoadTag.Load, id: loadId }],
    }),

    // PATCH /api/loads/:loadId/expenses — update per-load expense overrides
    updateLoadExpenses: build.mutation<Load, { loadId: string; body: ExpenseOverrideFields }>({
      query: ({ loadId, body }) => ({
        url: `loads/${loadId}/expenses`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { loadId }) => [
        { type: LoadTag.Load, id: loadId },
        // Invalidate all Driver tags (revenue cache uses driverId-revenue)
        { type: LoadTag.Driver, id: LoadTagId.List },
      ],
    }),
  }),
  overrideExisting: false,
})

// Auto-generated hooks
export const {
  useListAvailableLoadsQuery,
  useGetLoadQuery,
  useListCompanyLoadsQuery,
  useCreateLoadMutation,
  useCreateAuctionMutation,
  useUpdateLoadMutation,
  useUpdateLoadExpensesMutation,
} = loadApi
