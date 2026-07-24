import { api } from '../api'
import { LoadTag } from '../apiTypes'
import type {
  PlatformStats,
  AdminUser,
  AdminDriver,
  RateConfirmationBid,
  BillOfLadingBid,
  AnalyticsResponse,
  AdminInsights,
} from './adminEnum'

export type {
  PlatformStats,
  AdminUser,
  InsuranceCert,
  CertDoc,
  AdminDriver,
  RateConfirmationBid,
  BillOfLadingBid,
  AnalyticsResponse,
  AnalyticsPoint,
  AnalyticsMetricKey,
  AdminInsights,
  TopCompany,
  TopDriver,
  TopLane,
  ActivityStats,
} from './adminEnum'

export const adminApi = api.injectEndpoints({
  endpoints: (build) => ({
    getPlatformStats: build.query<PlatformStats, void>({
      query: () => 'admin/stats',
      providesTags: [{ type: LoadTag.Admin, id: 'STATS' }],
    }),

    getAdminAnalytics: build.query<AnalyticsResponse, { days?: number } | void>({
      query: (arg) => `admin/analytics${arg?.days ? `?days=${arg.days}` : ''}`,
      providesTags: [{ type: LoadTag.Admin, id: 'ANALYTICS' }],
    }),

    getAdminInsights: build.query<AdminInsights, void>({
      query: () => 'admin/insights',
      providesTags: [{ type: LoadTag.Admin, id: 'INSIGHTS' }],
    }),

    listAdminUsers: build.query<AdminUser[], { role?: string }>({
      query: ({ role } = {}) => `admin/users${role ? `?role=${role}` : ''}`,
      providesTags: [{ type: LoadTag.Admin, id: 'USERS' }],
    }),

    banUser: build.mutation<{ message: string }, { userId: string; reason?: string }>({
      query: ({ userId, reason }) => ({
        url: `admin/users/${userId}/ban`,
        method: 'PATCH',
        body: { reason },
      }),
      invalidatesTags: [{ type: LoadTag.Admin, id: 'USERS' }],
    }),

    unbanUser: build.mutation<{ message: string }, { userId: string }>({
      query: ({ userId }) => ({
        url: `admin/users/${userId}/unban`,
        method: 'PATCH',
      }),
      invalidatesTags: [{ type: LoadTag.Admin, id: 'USERS' }],
    }),

    deleteAdminUser: build.mutation<void, { userId: string }>({
      query: ({ userId }) => ({
        url: `admin/users/${userId}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: LoadTag.Admin, id: 'USERS' }],
    }),

    listAdminDrivers: build.query<AdminDriver[], void>({
      query: () => 'admin/drivers',
      providesTags: [{ type: LoadTag.Admin, id: 'DRIVERS' }],
    }),

    getDriverDocuments: build.query<AdminDriver, string>({
      query: (driverId) => `admin/drivers/${driverId}`,
      providesTags: (_r, _e, driverId) => [{ type: LoadTag.Admin, id: `DRIVER-${driverId}` }],
    }),

    approveInsuranceCert: build.mutation<{ message: string }, { driverId: string; idx: number }>({
      query: ({ driverId, idx }) => ({
        url: `admin/drivers/${driverId}/insurance/${idx}/approve`,
        method: 'PATCH',
      }),
      invalidatesTags: (_r, _e, { driverId }) => [
        { type: LoadTag.Admin, id: `DRIVER-${driverId}` },
        { type: LoadTag.Admin, id: 'DRIVERS' },
      ],
    }),

    rejectInsuranceCert: build.mutation<
      { message: string },
      { driverId: string; idx: number; reason?: string }
    >({
      query: ({ driverId, idx, reason }) => ({
        url: `admin/drivers/${driverId}/insurance/${idx}/reject`,
        method: 'PATCH',
        body: { reason },
      }),
      invalidatesTags: (_r, _e, { driverId }) => [
        { type: LoadTag.Admin, id: `DRIVER-${driverId}` },
        { type: LoadTag.Admin, id: 'DRIVERS' },
      ],
    }),

    approveCertDoc: build.mutation<{ message: string }, { driverId: string; idx: number }>({
      query: ({ driverId, idx }) => ({
        url: `admin/drivers/${driverId}/certdoc/${idx}/approve`,
        method: 'PATCH',
      }),
      invalidatesTags: (_r, _e, { driverId }) => [
        { type: LoadTag.Admin, id: `DRIVER-${driverId}` },
        { type: LoadTag.Admin, id: 'DRIVERS' },
      ],
    }),

    rejectCertDoc: build.mutation<
      { message: string },
      { driverId: string; idx: number; reason?: string }
    >({
      query: ({ driverId, idx, reason }) => ({
        url: `admin/drivers/${driverId}/certdoc/${idx}/reject`,
        method: 'PATCH',
        body: { reason },
      }),
      invalidatesTags: (_r, _e, { driverId }) => [
        { type: LoadTag.Admin, id: `DRIVER-${driverId}` },
        { type: LoadTag.Admin, id: 'DRIVERS' },
      ],
    }),

    getDocumentDownloadUrl: build.query<{ url: string }, string>({
      query: (key) => `admin/documents/download?key=${encodeURIComponent(key)}`,
    }),

    listRateConfirmations: build.query<RateConfirmationBid[], void>({
      query: () => 'admin/rate-confirmations',
      providesTags: [{ type: LoadTag.Admin, id: 'RC-LIST' }],
    }),

    listBillsOfLading: build.query<BillOfLadingBid[], void>({
      query: () => 'admin/bill-of-ladings',
      providesTags: [{ type: LoadTag.Admin, id: 'BOL-LIST' }],
    }),

    generateRateConfirmation: build.mutation<
      { url: string; key: string },
      { loadId: string; bidId: string }
    >({
      query: ({ loadId, bidId }) => ({
        url: `admin/loads/${loadId}/bids/${bidId}/rate-confirmation`,
        method: 'POST',
      }),
      invalidatesTags: [{ type: LoadTag.Admin, id: 'RC-LIST' }],
    }),
  }),
})

export const {
  useGetPlatformStatsQuery,
  useGetAdminAnalyticsQuery,
  useGetAdminInsightsQuery,
  useListAdminUsersQuery,
  useBanUserMutation,
  useUnbanUserMutation,
  useDeleteAdminUserMutation,
  useListAdminDriversQuery,
  useGetDriverDocumentsQuery,
  useApproveInsuranceCertMutation,
  useRejectInsuranceCertMutation,
  useApproveCertDocMutation,
  useRejectCertDocMutation,
  useLazyGetDocumentDownloadUrlQuery,
  useListRateConfirmationsQuery,
  useListBillsOfLadingQuery,
  useGenerateRateConfirmationMutation,
} = adminApi
