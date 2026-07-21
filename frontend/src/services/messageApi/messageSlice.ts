import { api } from '../api'
import { LoadTag } from '../apiTypes'
import type {
  Message,
  MessageThread,
  MessageThreadSummary,
  MessageUnreadCounts,
} from './messageEnum'

export type {
  Message,
  MessageThread,
  MessageThreadSummary,
  MessageUnreadCounts,
  ThreadCounterparty,
} from './messageEnum'
export { MESSAGE_BODY_MAX_LENGTH } from './messageEnum'

export const messageApi = api.injectEndpoints({
  endpoints: (build) => ({
    // GET /api/loads/:loadId/messages -> full thread + counterparty info
    getLoadThread: build.query<MessageThread, string>({
      query: (loadId) => `loads/${loadId}/messages`,
      providesTags: (_result, _err, loadId) => [{ type: LoadTag.Message, id: loadId }],
    }),

    // POST /api/loads/:loadId/messages -> send a message on the thread
    sendMessage: build.mutation<Message, { loadId: string; body: string }>({
      query: ({ loadId, body }) => ({
        url: `loads/${loadId}/messages`,
        method: 'POST',
        body: { body },
      }),
      // Keep the archive list's preview/ordering current after sending
      invalidatesTags: [{ type: LoadTag.Message, id: 'THREADS' }],
      // Append optimistically-adjacent: patch the cached thread with the
      // created message so the sender sees it without a refetch.
      async onQueryStarted({ loadId }, { dispatch, queryFulfilled }) {
        try {
          const { data: created } = await queryFulfilled
          dispatch(
            messageApi.util.updateQueryData('getLoadThread', loadId, (draft) => {
              if (!draft.messages.some((m) => m._id === created._id)) {
                draft.messages.push(created)
              }
            })
          )
        } catch {
          // Send failed — the form surfaces the error; nothing to patch.
        }
      },
    }),

    // PATCH /api/loads/:loadId/messages/read -> mark thread read for me
    markThreadRead: build.mutation<{ modifiedCount: number }, string>({
      query: (loadId) => ({ url: `loads/${loadId}/messages/read`, method: 'PATCH' }),
      invalidatesTags: [
        { type: LoadTag.Message, id: 'UNREAD' },
        { type: LoadTag.Message, id: 'THREADS' },
      ],
    }),

    // GET /api/messages/unread-counts -> total + per-load unread badge counts
    getMessageUnreadCounts: build.query<MessageUnreadCounts, void>({
      query: () => 'messages/unread-counts',
      providesTags: [{ type: LoadTag.Message, id: 'UNREAD' }],
    }),

    // GET /api/messages/threads -> conversation archive, newest activity first
    listMessageThreads: build.query<MessageThreadSummary[], void>({
      query: () => 'messages/threads',
      providesTags: [{ type: LoadTag.Message, id: 'THREADS' }],
    }),
  }),
})

export const {
  useGetLoadThreadQuery,
  useSendMessageMutation,
  useMarkThreadReadMutation,
  useGetMessageUnreadCountsQuery,
  useListMessageThreadsQuery,
} = messageApi
