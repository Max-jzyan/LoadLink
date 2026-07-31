import { getHttpErrorMessage, showError, showSuccess, getErrorStatus } from '@/lib/toast'
import { api } from '../api'
import { LoadTag, LoadTagId, type TagDescription } from '../apiTypes'
import type {
  BlocklistEntry,
  BlockUserPayload,
  FeedPreferences,
  KnownUser,
  UnblockUserPayload,
  UpdateFeedPreferencesPayload,
} from './blocklistEnum'

/** Prefer the backend's { message } body over the generic status text */
const getServerErrorMessage = (error: unknown, fallbackStatus: number) => {
  const data = (error as { error?: { data?: { message?: string } } })?.error?.data
  return data?.message ?? getHttpErrorMessage(fallbackStatus)
}

export const blocklistApi = api.injectEndpoints({
  endpoints: (build) => ({
    // GET /api/blocklist/:userId — active blocklist entries with target populated
    getBlocklist: build.query<BlocklistEntry[], string>({
      query: (userId) => `blocklist/${userId}`,
      providesTags: (_result, _error, userId) => [{ type: LoadTag.Blocklist, id: userId }],
    }),

    // POST /api/blocklist/:userId — block a registered user by name
    blockUser: build.mutation<BlocklistEntry, BlockUserPayload>({
      query: ({ userId, body }) => ({
        url: `blocklist/${userId}`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (result, _error, { userId }): TagDescription[] => [
        { type: LoadTag.Blocklist, id: userId },
        // Force the driver's live auction board (and scored/recommended lists) to refetch
        // so loads from the newly-blocked company disappear immediately.
        { type: LoadTag.Load, id: LoadTagId.List },
        { type: LoadTag.Load, id: `${userId}-scored` },
        { type: LoadTag.Load, id: `${userId}-recommended` },
        // Also bust any already-cached single-load view (e.g. an open auction
        // detail page) for loads posted by the newly-blocked company.
        ...(result?.targetId ? [{ type: LoadTag.Load, id: `company-${result.targetId._id}` }] : []),
      ],
      async onQueryStarted(arg, { queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          showSuccess(`${data.targetId?.name ?? arg.body.targetName} has been blocked`)
        } catch (error) {
          showError(getServerErrorMessage(error, getErrorStatus(error)))
        }
      },
    }),

    // DELETE /api/blocklist/:userId/:targetId — unblock a target
    unblockUser: build.mutation<void, UnblockUserPayload>({
      query: ({ userId, targetId }) => ({
        url: `blocklist/${userId}/${targetId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { userId, targetId }): TagDescription[] => [
        { type: LoadTag.Blocklist, id: userId },
        // Force the driver's live auction board (and scored/recommended lists) to refetch
        // so loads from the newly-unblocked company reappear immediately.
        { type: LoadTag.Load, id: LoadTagId.List },
        { type: LoadTag.Load, id: `${userId}-scored` },
        { type: LoadTag.Load, id: `${userId}-recommended` },
        // Also bust any cached single-load view so it re-fetches as accessible again.
        { type: LoadTag.Load, id: `company-${targetId}` },
      ],
      async onQueryStarted(_arg, { queryFulfilled }) {
        try {
          await queryFulfilled
          showSuccess('Unblocked successfully')
        } catch (error) {
          showError(getServerErrorMessage(error, getErrorStatus(error)))
        }
      },
    }),

    // GET /api/users/:userId/feed-preferences
    getFeedPreferences: build.query<FeedPreferences, string>({
      query: (userId) => `users/${userId}/feed-preferences`,
      providesTags: (_result, _error, userId) => [{ type: LoadTag.FeedPrefs, id: userId }],
    }),

    // GET /api/blocklist/:userId/known-users
    getKnownUsers: build.query<KnownUser[], string>({
      query: (userId) => `blocklist/${userId}/known-users`,
      providesTags: (_result, _error, userId) => [
        { type: LoadTag.Blocklist, id: `known-${userId}` },
      ],
    }),

    // PATCH /api/users/:userId/feed-preferences — optimistic so switches feel instant
    updateFeedPreferences: build.mutation<FeedPreferences, UpdateFeedPreferencesPayload>({
      query: ({ userId, body }) => ({
        url: `users/${userId}/feed-preferences`,
        method: 'PATCH',
        body,
      }),
      async onQueryStarted({ userId, body }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          blocklistApi.util.updateQueryData('getFeedPreferences', userId, (draft) => {
            Object.assign(draft, body)
          })
        )
        try {
          await queryFulfilled
        } catch (error) {
          patch.undo()
          showError(getServerErrorMessage(error, getErrorStatus(error)))
        }
      },
    }),
  }),
  overrideExisting: false,
})

export const {
  useGetBlocklistQuery,
  useBlockUserMutation,
  useUnblockUserMutation,
  useGetFeedPreferencesQuery,
  useUpdateFeedPreferencesMutation,
  useGetKnownUsersQuery,
} = blocklistApi
