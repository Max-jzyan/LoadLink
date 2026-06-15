import { api } from '../api'
import { LoadTag, LoadTagId } from '../apiTypes'
import type { CreateLoadPayload, Load, UpdateLoadPayload } from './loadEnum'

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

    // GET /api/loads/:loadId — fetch single load
    getLoad: build.query<Load, string>({
      query: (loadId) => `loads/${loadId}`,
      providesTags: (_result, _error, loadId) => [{ type: LoadTag.Load, id: loadId }],
    }),

    // GET /api/company/:companyId/loads — list company loads
    listCompanyLoads: build.query<Load[], string>({
      query: (companyId) => `company/${companyId}/loads`,
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

    // PATCH /api/loads/:loadId — update a load
    updateLoad: build.mutation<Load, { loadId: string; body: UpdateLoadPayload }>({
      query: ({ loadId, body }) => ({
        url: `loads/${loadId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { loadId }) => [
        { type: LoadTag.Load, id: loadId },
        { type: LoadTag.Load, id: LoadTagId.List },
        { type: LoadTag.Load, id: LoadTagId.CompanyList },
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
  useUpdateLoadMutation,
} = loadApi
