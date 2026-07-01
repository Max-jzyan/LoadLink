import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { LoadTag } from './apiTypes'

export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  tagTypes: [LoadTag.Load, LoadTag.Bid, LoadTag.AuctionPrice, LoadTag.Truck, LoadTag.Driver],
  endpoints: () => ({}),
})
