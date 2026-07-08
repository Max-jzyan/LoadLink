import { getHttpErrorMessage, showError, showSuccess, getErrorStatus } from '@/lib/toast'
import { api } from '../api'
import { LoadTag } from '../apiTypes'
import type { CreateReportPayload, Report } from './reportEnum'

export const reportApi = api.injectEndpoints({
  endpoints: (build) => ({
    // GET /api/reports/user/:userId — reports submitted by the current user
    getMyReports: build.query<Report[], string>({
      query: (userId) => `reports/user/${userId}`,
      providesTags: (_result, _error, userId) => [{ type: LoadTag.Report, id: userId }],
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
      async onQueryStarted(arg, { queryFulfilled }) {
        try {
          await queryFulfilled
          showSuccess('Report submitted — our trust & safety team will review it')
        } catch (error) {
          const status = getErrorStatus(error)
          showError(getHttpErrorMessage(status))
        }
      },
    }),
  }),
  overrideExisting: false,
})

export const { useGetMyReportsQuery, useCreateReportMutation } = reportApi
