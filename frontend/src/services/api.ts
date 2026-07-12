import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
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

export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api',
    prepareHeaders: (headers) => {
      if (cachedToken) {
        headers.set('Authorization', `Bearer ${cachedToken}`)
      }
      return headers
    },
  }),
  tagTypes: [
    LoadTag.Load,
    LoadTag.Bid,
    LoadTag.AuctionPrice,
    LoadTag.Truck,
    LoadTag.Trailer,
    LoadTag.DriverProfile,
    LoadTag.Driver,
    LoadTag.Review,
    LoadTag.Blocklist,
    LoadTag.Report,
    LoadTag.FeedPrefs,
    LoadTag.Profile,
    LoadTag.Notification,
    LoadTag.Auction,
    LoadTag.Admin,
  ],
  endpoints: () => ({}),
})