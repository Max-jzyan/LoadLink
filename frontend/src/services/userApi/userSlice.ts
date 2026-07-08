import { api } from '../api'
import type { RegisterUserPayload, RegisterUserResponse } from './userEnum'
import {
  showSuccess,
  showError,
  getSuccessMessage,
  getHttpErrorMessage,
  getErrorStatus,
} from '@/lib/toast'

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

    // GET /api/users/me?firebaseUid=... -> fetch existing user by Firebase UID
    getUserByFirebaseUid: build.query<RegisterUserResponse, string>({
      query: (firebaseUid) => `users/me?firebaseUid=${encodeURIComponent(firebaseUid)}`,
    }),
  }),
  overrideExisting: false,
})

export const { useRegisterUserMutation, useLazyGetUserByFirebaseUidQuery } = userApi
