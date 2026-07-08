import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { LoadTag } from './apiTypes'
import { auth } from '@/lib/firebase'

export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api',
    prepareHeaders: async (headers) => {
      const user = auth.currentUser
      if (user) {
        const token = await user.getIdToken()
        headers.set('Authorization', `Bearer ${token}`)
      }
      return headers
    },
  }),
  tagTypes: [
    LoadTag.Load,
    LoadTag.Bid,
    LoadTag.AuctionPrice,
    LoadTag.Truck,
    LoadTag.Driver,
    LoadTag.Review,
    LoadTag.Blocklist,
    LoadTag.Report,
    LoadTag.FeedPrefs,
  ],
  endpoints: () => ({}),
})
