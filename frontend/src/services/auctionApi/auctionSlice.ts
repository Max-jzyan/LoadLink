import { api } from '../api'
import { LoadTag, LoadTagId } from '../apiTypes'
import type {
  AcceptBidResult,
  BidsStreamPayload,
  EditAuctionPayload,
  EditAuctionResult,
  PriceStreamPayload,
  ReopenAuctionPayload,
  ReopenAuctionResult,
} from './auctionEnum'
import {
  showSuccess,
  showError,
  getSuccessMessage,
  getHttpErrorMessage,
  getErrorStatus,
} from '@/lib/toast'
import { withSSEToken } from '@/lib/sse'

export const auctionApi = api.injectEndpoints({
  endpoints: (build) => ({
    acceptBid: build.mutation<AcceptBidResult, { loadId: string; bidId: string }>({
      query: ({ loadId, bidId }) => ({
        url: `auctions/${loadId}/bids/${bidId}`,
        method: 'PATCH',
      }),
      invalidatesTags: (result) => {
        const tags: any[] = [{ type: LoadTag.Load, id: result?.loadId }]
        if (result?.driverId) {
          tags.push({ type: LoadTag.Driver, id: `${result.driverId}-revenue` })
        }
        return tags
      },
      async onQueryStarted(_arg, { queryFulfilled }) {
        try {
          await queryFulfilled
          showSuccess(getSuccessMessage('accept', 'bid'))
        } catch (error) {
          const status = getErrorStatus(error)
          showError(getHttpErrorMessage(status))
        }
      },
    }),

    editAuction: build.mutation<EditAuctionResult, { loadId: string; body: EditAuctionPayload }>({
      query: ({ loadId, body }) => ({
        url: `auctions/${loadId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { loadId }) => [{ type: LoadTag.Load, id: loadId }],
      async onQueryStarted(_arg, { queryFulfilled }) {
        try {
          await queryFulfilled
          showSuccess(getSuccessMessage('update', 'auction'))
        } catch (error) {
          const status = getErrorStatus(error)
          showError(getHttpErrorMessage(status))
        }
      },
    }),

    cancelAuction: build.mutation<void, string>({
      query: (loadId) => ({
        url: `auctions/${loadId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, loadId) => [{ type: LoadTag.Load, id: loadId }],
      async onQueryStarted(_arg, { queryFulfilled }) {
        try {
          await queryFulfilled
          showSuccess(getSuccessMessage('cancel', 'auction'))
        } catch (error) {
          const status = getErrorStatus(error)
          showError(getHttpErrorMessage(status))
        }
      },
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
      async onQueryStarted(_arg, { queryFulfilled }) {
        try {
          await queryFulfilled
          showSuccess(getSuccessMessage('reopen', 'auction'))
        } catch (error) {
          const status = getErrorStatus(error)
          showError(getHttpErrorMessage(status))
        }
      },
    }),

    /**
     * SSE stream of bids for a load. Opens an EventSource when the query cache is
     * active, pushes incoming payloads into the cache, and closes on cache entry removal.
     *
     * Uses queryFn to return a placeholder so cacheDataLoaded resolves immediately
     * without making a failing HTTP request (the backend sends SSE format, not JSON).
     */
    streamBids: build.query<BidsStreamPayload | null, string>({
      queryFn: () => ({ data: null }),
      async onCacheEntryAdded(loadId, { updateCachedData, cacheDataLoaded, cacheEntryRemoved }) {
        await cacheDataLoaded

        const es = new EventSource(await withSSEToken(`/api/auctions/${loadId}/bids`))

        es.onmessage = (e) => {
          try {
            const payload = JSON.parse(e.data) as BidsStreamPayload
            updateCachedData(() => payload)
          } catch {
            // ignore malformed events
          }
        }

        es.onerror = () => {
          es.close()
        }

        // Wait until the cache entry is removed (component unmount / ref changed)
        await cacheEntryRemoved

        es.close()
      },
    }),

    /**
     * SSE stream of current auction price for a load. Opens an EventSource when the
     * query cache is active, pushes incoming payloads into the cache, and closes on
     * cache entry removal.
     *
     * Uses queryFn to return a placeholder so cacheDataLoaded resolves immediately
     * without making a failing HTTP request (the backend sends SSE format, not JSON).
     */
    streamAuctionPrice: build.query<PriceStreamPayload | null, string>({
      queryFn: () => ({ data: null }),
      async onCacheEntryAdded(loadId, { updateCachedData, cacheDataLoaded, cacheEntryRemoved }) {
        await cacheDataLoaded

        const es = new EventSource(await withSSEToken(`/api/auctions/${loadId}/price`))

        es.onmessage = (e) => {
          try {
            const payload = JSON.parse(e.data) as PriceStreamPayload
            updateCachedData(() => payload)
          } catch {
            // ignore malformed events
          }
        }

        es.onerror = () => {
          es.close()
        }

        // Wait until the cache entry is removed (component unmount / ref changed)
        await cacheEntryRemoved

        es.close()
      },
    }),
  }),
  overrideExisting: false,
})

export const {
  useAcceptBidMutation,
  useEditAuctionMutation,
  useCancelAuctionMutation,
  useReopenAuctionMutation,
  useStreamBidsQuery,
  useStreamAuctionPriceQuery,
} = auctionApi
