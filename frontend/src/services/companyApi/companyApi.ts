import { api } from '../api'
import { LoadTag, LoadTagId } from '../apiTypes'
import type { Company, CompanyDashboardData } from './companyTypes'
import type { CompanyProfile, UpdateCompanyProfilePayload } from './companyEnum'

// inject company-facing endpoints into the shared RTK Query api instance
export const companyApi = api.injectEndpoints({
  endpoints: (build) => ({
    // GET /api/companies -- dev only, no auth guard, replace with /me when firebase is wired up
    listCompanies: build.query<Company[], void>({
      query: () => 'companies',
      // companies rarely change so no cache invalidation needed here
    }),

    // GET /api/company/:companyId/dashboard
    // returns enriched loads (with bid counts and populated auction) plus summary stats
    getCompanyDashboard: build.query<CompanyDashboardData, string>({
      query: (companyId) => `company/${companyId}/dashboard`,
      // share the company load cache tag so creating/updating a load refetches the dashboard
      providesTags: [{ type: LoadTag.Load, id: LoadTagId.CompanyList }],
    }),

    // GET /api/company/:companyId/profile — fetch full company profile
    getCompanyProfile: build.query<CompanyProfile, string>({
      query: (companyId) => `company/${companyId}/profile`,
      providesTags: (_result, _error, companyId) => [{ type: LoadTag.Company, id: companyId }],
    }),

    // PATCH /api/company/:companyId/profile — update company profile fields
    updateCompanyProfile: build.mutation<
      CompanyProfile,
      { companyId: string; body: UpdateCompanyProfilePayload }
    >({
      query: ({ companyId, body }) => ({
        url: `company/${companyId}/profile`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { companyId }) => [
        { type: LoadTag.Company, id: companyId },
        { type: LoadTag.Profile, id: 'ME' },
      ],
    }),
  }),
  overrideExisting: false,
})

export const { useListCompaniesQuery, useGetCompanyDashboardQuery, useGetCompanyProfileQuery, useUpdateCompanyProfileMutation } = companyApi
