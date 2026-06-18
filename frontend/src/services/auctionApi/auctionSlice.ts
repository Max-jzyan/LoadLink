import { api } from '../api'
import { LoadTag } from '../apiTypes'
import type {
  AcceptBidResult,
  EditAuctionPayload,
  EditAuctionResult,
  ReopenAuctionPayload,
  ReopenAuctionResult,
} from './auctionEnum'

export const auctionApi = api.injectEndpoints({
  endpoints: (build) => ({
    acceptBid: build.mutation<AcceptBidResult, { loadId: string; bidId: string }>({
      query: ({ loadId, bidId }) => ({
        url: `auctions/${loadId}/bids/${bidId}`,
        method: 'PATCH',
      }),
      invalidatesTags: (_result, _error, { loadId }) => [{ type: LoadTag.Load, id: loadId }],
    }),

    editAuction: build.mutation<EditAuctionResult, { loadId: string; body: EditAuctionPayload }>({
      query: ({ loadId, body }) => ({
        url: `auctions/${loadId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { loadId }) => [{ type: LoadTag.Load, id: loadId }],
    }),

    cancelAuction: build.mutation<void, string>({
      query: (loadId) => ({
        url: `auctions/${loadId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, loadId) => [{ type: LoadTag.Load, id: loadId }],
    }),

    reopenAuction: build.mutation<
      ReopenAuctionResult,
      { loadId: string; body: ReopenAuctionPayload }
    >({
      query: ({ loadId, body }) => ({
        url: `auctions/${loadId}/reopen`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { loadId }) => [{ type: LoadTag.Load, id: loadId }],
    }),
  }),
  overrideExisting: false,
})

export const {
  useAcceptBidMutation,
  useEditAuctionMutation,
  useCancelAuctionMutation,
  useReopenAuctionMutation,
} = auctionApi
