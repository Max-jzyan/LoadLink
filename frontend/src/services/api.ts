import { createApi, fetchBaseQuery, type BaseQueryFn } from '@reduxjs/toolkit/query/react'
import type { FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query'
import { onIdTokenChanged } from 'firebase/auth'
import { LoadTag } from './apiTypes'
import { auth } from '@/lib/firebase'

// Module-level token cache populated by onIdTokenChanged listener.
// This ensures prepareHeaders always has access to a valid token synchronously,
// avoiding race conditions where auth.currentUser is not yet hydrated.
let cachedToken: string | null = null

/** Unix timestamp (ms) when the current Firebase ID token expires. */
let _tokenExpiresAt: number | null = null

/** Returns the token expiry timestamp in ms (or null if no user is signed in). */
export function getTokenExpiresAt(): number | null {
  return _tokenExpiresAt
}

onIdTokenChanged(auth, async (user) => {
  if (user) {
    cachedToken = await user.getIdToken()
    // Decode the token to extract the exp claim (seconds since epoch), convert to ms.
    const tokenResult = await user.getIdTokenResult()
    _tokenExpiresAt = tokenResult.expirationTime
      ? new Date(tokenResult.expirationTime).getTime()
      : null
  } else {
    cachedToken = null
    _tokenExpiresAt = null
  }
})

const rawBaseQuery = fetchBaseQuery({
  baseUrl: '/api',
  prepareHeaders: (headers) => {
    if (cachedToken) {
      headers.set('Authorization', `Bearer ${cachedToken}`)
    }
    return headers
  },
})

/**
 * Wraps the base query so that ANY request — from any endpoint, at any
 * point in the session, not just at login — that comes back with the
 * `ACCOUNT_BANNED` error code immediately surfaces the red AccountBannedDialog.
 * Firebase itself has no concept of our Mongo-side ban flag, so a banned
 * user's client-side session otherwise stays "logged in" until they happen
 * to reload; this catches it on the very next API call instead.
 *
 * Dispatches the same `setBanReason`/`setSessionState('banned')` actions used
 * by subscribeToAuthChanges (login/token-restore) and the notifications SSE
 * listener (AccountBannedDialog) so there's a single, consistent banned-state
 * flow no matter which of the three paths detects it. The dialog itself owns
 * the actual sign-out (via its "Return to Login" button) so the user has a
 * chance to read why before being kicked out.
 *
 * authSlice.ts imports `api` from this file for `resetApiState()`, so this
 * import is circular — safe here because both sides only reference the
 * other's exports inside function bodies invoked at runtime, never during
 * module evaluation.
 */
const baseQueryWithBanHandling: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, apiInternal, extraOptions) => {
  const result = await rawBaseQuery(args, apiInternal, extraOptions)

  if (result.error?.status === 403) {
    const data = result.error.data as { code?: string; message?: string } | undefined
    if (data?.code === 'ACCOUNT_BANNED') {
      const { setBanReason, setSessionState } = await import('./authSlice')
      apiInternal.dispatch(setBanReason(data.message ?? 'Your account has been suspended.'))
      apiInternal.dispatch(setSessionState('banned'))
    }
  }

  return result
}

export const api = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithBanHandling,
  tagTypes: [
    LoadTag.Load,
    LoadTag.Bid,
    LoadTag.AuctionPrice,
    LoadTag.Truck,
    LoadTag.Trailer,
    LoadTag.DriverProfile,
    LoadTag.Driver,
    LoadTag.Company,
    LoadTag.Review,
    LoadTag.Blocklist,
    LoadTag.Report,
    LoadTag.FeedPrefs,
    LoadTag.Profile,
    LoadTag.Notification,
    LoadTag.Message,
    LoadTag.Auction,
    LoadTag.Admin,
    LoadTag.FavoriteAddress,
  ],
  endpoints: () => ({}),
})
