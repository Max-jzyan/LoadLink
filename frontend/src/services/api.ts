import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { onIdTokenChanged } from 'firebase/auth'
import { LoadTag } from './apiTypes'
import { auth } from '@/lib/firebase'

// Module-level token cache populated by onIdTokenChanged listener.
// This ensures prepareHeaders always has access to a valid token synchronously,
// avoiding race conditions where auth.currentUser is not yet hydrated.
let cachedToken: string | null = null

onIdTokenChanged(auth, async (user) => {
  cachedToken = user ? await user.getIdToken() : null
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
