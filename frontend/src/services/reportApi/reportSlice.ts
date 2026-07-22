import { getHttpErrorMessage, showError, showSuccess, getErrorStatus } from '@/lib/toast'
import { api } from '../api'
import { LoadTag } from '../apiTypes'
import type {
  AdminReport,
  CreateReportPayload,
  Report,
  ReportCollaborator,
  ReportableLoad,
  ReportStatus,
  UpdateReportStatusPayload,
} from './reportEnum'

/** Prefer the backend's { message } body over the generic status text */
const getServerErrorMessage = (error: unknown, fallbackStatus: number) => {
  const data = (error as { error?: { data?: { message?: string } } })?.error?.data
  return data?.message ?? getHttpErrorMessage(fallbackStatus)
}

export const reportApi = api.injectEndpoints({
  endpoints: (build) => ({
    // GET /api/reports/user/:userId — reports submitted by the current user
    getMyReports: build.query<Report[], string>({
      query: (userId) => `reports/user/${userId}`,
      providesTags: (_result, _error, userId) => [{ type: LoadTag.Report, id: userId }],
    }),

    // GET /api/reports/collaborators — users the caller has actually worked
    // with (the only valid fraud-report targets); feeds the autocomplete
    getReportCollaborators: build.query<ReportCollaborator[], void>({
      query: () => 'reports/collaborators',
    }),

    // GET /api/reports/loads — loads the caller (driver) has bid on or been
    // assigned (the only valid inaccurate-report targets); feeds the load picker
    getReportableLoads: build.query<ReportableLoad[], void>({
      query: () => 'reports/loads',
    }),

    // POST /api/reports — submit a fraud or inaccurate-details report
    createReport: build.mutation<Report, CreateReportPayload>({
      query: (body) => ({
        url: 'reports',
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { reporterId }) => [
        { type: LoadTag.Report, id: reporterId },
      ],
      async onQueryStarted(_arg, { queryFulfilled }) {
        try {
          await queryFulfilled
          showSuccess('Report submitted — our trust & safety team will review it')
        } catch (error) {
          showError(getServerErrorMessage(error, getErrorStatus(error)))
        }
      },
    }),

    // GET /api/reports?status= — admin view of all reports across users
    getAllReports: build.query<AdminReport[], { status?: ReportStatus } | void>({
      query: (args) => `reports${args?.status ? `?status=${args.status}` : ''}`,
      providesTags: [{ type: LoadTag.Report, id: 'ADMIN_LIST' }],
    }),

    // PATCH /api/reports/:reportId/status — admin resolves/dismisses/reopens a report
    updateReportStatus: build.mutation<AdminReport, UpdateReportStatusPayload>({
      query: ({ reportId, status, adminId }) => ({
        url: `reports/${reportId}/status`,
        method: 'PATCH',
        body: { status, adminId },
      }),
      invalidatesTags: [{ type: LoadTag.Report, id: 'ADMIN_LIST' }],
      async onQueryStarted(_arg, { queryFulfilled }) {
        try {
          await queryFulfilled
          showSuccess('Report status updated')
        } catch (error) {
          showError(getServerErrorMessage(error, getErrorStatus(error)))
        }
      },
    }),
  }),
  overrideExisting: false,
})

export const {
  useGetMyReportsQuery,
  useGetReportCollaboratorsQuery,
  useGetReportableLoadsQuery,
  useCreateReportMutation,
  useGetAllReportsQuery,
  useUpdateReportStatusMutation,
} = reportApi
