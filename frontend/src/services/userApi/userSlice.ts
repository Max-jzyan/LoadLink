import { api } from '../api'
import { LoadTag } from '../apiTypes'
import type { RegisterUserPayload, RegisterUserResponse, MyProfile } from './userEnum'
import { showSuccess, showError, getSuccessMessage, getHttpErrorMessage, getErrorStatus } from '@/lib/toast'

export const userApi = api.injectEndpoints({
  endpoints: (build) => ({
    // POST /api/users/register -> create a user profile in MongoDB
    registerUser: build.mutation<RegisterUserResponse, RegisterUserPayload>({
      query: (body) => ({
        url: 'users/register',
        method: 'POST',
        body,
      }),
      async onQueryStarted(_arg, { queryFulfilled }) {
        try {
          await queryFulfilled
          showSuccess(getSuccessMessage('create', 'user profile'))
        } catch (error) {
          const status = getErrorStatus(error)
          showError(getHttpErrorMessage(status))
        }
      },
    }),

    // GET /api/users/me/profile -> fetch the full profile (role-agnostic); auth via Bearer token
    getMyProfile: build.query<MyProfile, void>({
      query: () => `users/me/profile`,
      providesTags: [{ type: LoadTag.Profile, id: 'ME' }],
    }),
  }),
  overrideExisting: false,
})

export const { useRegisterUserMutation, useGetMyProfileQuery } = userApi
