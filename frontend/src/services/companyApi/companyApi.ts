import { api } from '../api'
import { LoadTag, LoadTagId } from '../apiTypes'
import type { Company, CompanyDashboardData } from './companyTypes'

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
  }),
  overrideExisting: false,
})

export const { useListCompaniesQuery, useGetCompanyDashboardQuery } = companyApi
