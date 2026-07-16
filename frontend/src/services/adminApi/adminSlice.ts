import { api } from '../api'
import { LoadTag } from '../apiTypes'
import type { PlatformStats, AdminUser, AdminDriver, RateConfirmationBid } from './adminEnum'

export type {
  PlatformStats,
  AdminUser,
  InsuranceCert,
  CertDoc,
  AdminDriver,
  RateConfirmationBid,
} from './adminEnum'

export const adminApi = api.injectEndpoints({
  endpoints: (build) => ({
    getPlatformStats: build.query<PlatformStats, void>({
      query: () => 'admin/stats',
      providesTags: [{ type: LoadTag.Admin, id: 'STATS' }],
    }),

    listAdminUsers: build.query<AdminUser[], { role?: string }>({
      query: ({ role } = {}) => `admin/users${role ? `?role=${role}` : ''}`,
      providesTags: [{ type: LoadTag.Admin, id: 'USERS' }],
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
  useListAdminUsersQuery,
  useListAdminDriversQuery,
  useGetDriverDocumentsQuery,
  useApproveInsuranceCertMutation,
  useRejectInsuranceCertMutation,
  useApproveCertDocMutation,
  useRejectCertDocMutation,
  useLazyGetDocumentDownloadUrlQuery,
  useListRateConfirmationsQuery,
  useGenerateRateConfirmationMutation,
} = adminApi
