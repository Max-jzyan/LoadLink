import { api } from '../api'
import type { RegisterUserPayload, RegisterUserResponse } from './userEnum'

export const userApi = api.injectEndpoints({
  endpoints: (build) => ({
    // POST /api/users/register -> create a user profile in MongoDB
    registerUser: build.mutation<RegisterUserResponse, RegisterUserPayload>({
      query: (body) => ({
        url: 'users/register',
        method: 'POST',
        body,
      }),
    }),

    // GET /api/users/me?firebaseUid=... -> fetch existing user by Firebase UID
    getUserByFirebaseUid: build.query<RegisterUserResponse, string>({
      query: (firebaseUid) => `users/me?firebaseUid=${encodeURIComponent(firebaseUid)}`,
    }),
  }),
  overrideExisting: false,
})

export const { useRegisterUserMutation, useLazyGetUserByFirebaseUidQuery } = userApi
