import {
  getErrorStatus,
  getHttpErrorMessage,
  getSuccessMessage,
  showError,
  showSuccess,
} from '@/lib/toast'
import { api } from '../api'
import { LoadTag, LoadTagId, type TagDescription } from '../apiTypes'
import type { ExpenseOverrideFields } from '../driverApi/driverEnum'
import type {
  CreateAuctionPayload,
  CreateLoadPayload,
  CreatedAuction,
  Load,
  PopulatedLoad,
  UpdateLoadPayload,
} from './loadEnum'

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
      providesTags: (result, _error, loadId): TagDescription[] => {
        const tags: TagDescription[] = [{ type: LoadTag.Load, id: loadId }]
        const companyId =
          typeof result?.companyId === 'string' ? result.companyId : result?.companyId?._id
        // Also tag by company so blocking that company invalidates this cached
        // load, even if the viewer never revisits the auction list.
        if (companyId) {
          tags.push({ type: LoadTag.Load, id: `company-${companyId}` })
        }
        return tags
      },
    }),

    // GET /api/loads/:loadId/accepted-bid — return the accepted bid including rateConfirmationUrl
    getAcceptedBid: build.query<
      {
        _id: string
        driverId: string
        amount: number
        acceptedAt: string | null
        rateConfirmationUrl: string | null
        rateConfirmationKey: string | null
      } | null,
      string
    >({
      query: (loadId) => `loads/${loadId}/accepted-bid`,
      providesTags: (_result, _error, loadId) => [{ type: LoadTag.Bid, id: `accepted-${loadId}` }],
    }),

    // GET /api/company/:companyId/loads — list company loads, optionally filtered by driver, status, and/or excluding reviewed loads
    // Accepts either a plain companyId string (legacy) or an object with optional filters
    listCompanyLoads: build.query<
      Load[],
      | string
      | {
          companyId: string
          assignedDriverId?: string
          excludeReviewedBy?: string
          status?: string
        }
    >({
      query: (arg) => {
        let companyId: string
        let assignedDriverId: string | undefined
        let excludeReviewedBy: string | undefined
        let status: string | undefined
        if (typeof arg === 'string') {
          companyId = arg
        } else {
          companyId = arg.companyId
          assignedDriverId = arg.assignedDriverId
          excludeReviewedBy = arg.excludeReviewedBy
          status = arg.status
        }
        const params = new URLSearchParams()
        if (assignedDriverId) params.set('assignedDriverId', assignedDriverId)
        if (excludeReviewedBy) params.set('excludeReviewedBy', excludeReviewedBy)
        if (status) params.set('status', status)
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
      async onQueryStarted(_arg, { queryFulfilled }) {
        try {
          await queryFulfilled
          showSuccess(getSuccessMessage('create', 'load'))
        } catch (error) {
          const status = getErrorStatus(error)
          showError(getHttpErrorMessage(status))
        }
      },
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

    // PATCH /api/loads/:loadId — update a load (companies only)
    updateLoad: build.mutation<Load, { loadId: string; body: UpdateLoadPayload }>({
      query: ({ loadId, body }) => ({
        url: `loads/${loadId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (result, _error, { loadId }): TagDescription[] => {
        const tags: TagDescription[] = [
          { type: LoadTag.Load, id: loadId },
          // Dashboard shows auction prices, so refetch it after edits
          { type: LoadTag.Load, id: LoadTagId.CompanyList },
        ]
        if (result?.assignedDriverId) {
          tags.push({ type: LoadTag.Driver, id: `${result.assignedDriverId}-revenue` })
        }
        return tags
      },
    }),

    // PATCH /api/driver/:driverId/loads/:loadId/status — update load status (drivers only)
    updateLoadStatus: build.mutation<Load, { driverId: string; loadId: string; status: string }>({
      query: ({ driverId, loadId, status }) => ({
        url: `driver/${driverId}/loads/${loadId}/status`,
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: (result, _error, { driverId }): TagDescription[] => {
        const tags: TagDescription[] = [{ type: LoadTag.Load, id: result?._id }]
        if (driverId) {
          tags.push({ type: LoadTag.Driver, id: `${driverId}-revenue` })
          tags.push({ type: LoadTag.Load, id: `${driverId}-scored` })
        }
        return tags
      },
    }),

    // PATCH /api/loads/:loadId/expenses — update per-load expense overrides
    updateLoadExpenses: build.mutation<Load, { loadId: string; body: ExpenseOverrideFields }>({
      query: ({ loadId, body }) => ({
        url: `loads/${loadId}/expenses`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (result): TagDescription[] => {
        const tags: TagDescription[] = [{ type: LoadTag.Load, id: result?._id }]
        if (result?.assignedDriverId) {
          tags.push({ type: LoadTag.Driver, id: `${result.assignedDriverId}-revenue` })
        }
        return tags
      },
    }),
  }),
  overrideExisting: false,
})

// Auto-generated hooks
export const {
  useListAvailableLoadsQuery,
  useGetLoadQuery,
  useGetAcceptedBidQuery,
  useListCompanyLoadsQuery,
  useCreateLoadMutation,
  useCreateAuctionMutation,
  useUpdateLoadMutation,
  useUpdateLoadStatusMutation,
  useUpdateLoadExpensesMutation,
} = loadApi
