import { api } from '../api'
import { LoadTag } from '../apiTypes'
import type {
  NotificationListResponse,
  UnreadCountResponse,
  Notification,
} from './notificationEnum'
import { withSSEToken } from '@/lib/sse'

export type {
  Notification,
  NotificationListResponse,
  UnreadCountResponse,
  NotificationType,
} from './notificationEnum'
export { NOTIFICATION_TYPES } from './notificationEnum'

/**
 * Payload sent via SSE when a notification is created.
 * The backend sends the full notification document.
 */
export type NotificationStreamPayload = Notification

export const notificationApi = api.injectEndpoints({
  endpoints: (build) => ({
    listNotifications: build.query<
      NotificationListResponse,
      { page?: number; limit?: number; unreadOnly?: boolean }
    >({
      query: ({ page = 1, limit = 20, unreadOnly = false }) =>
        `notifications?page=${page}&limit=${limit}&unreadOnly=${unreadOnly}`,
      providesTags: [{ type: LoadTag.Notification, id: 'LIST' }],
    }),

    getUnreadCount: build.query<UnreadCountResponse, void>({
      query: () => 'notifications/unread-count',
      providesTags: [{ type: LoadTag.Notification, id: 'COUNT' }],
    }),

    markAsRead: build.mutation<Notification, string>({
      query: (notificationId) => ({
        url: `notifications/${notificationId}/read`,
        method: 'PATCH',
      }),
      invalidatesTags: [
        { type: LoadTag.Notification, id: 'LIST' },
        { type: LoadTag.Notification, id: 'COUNT' },
      ],
    }),

    markAllAsRead: build.mutation<{ modifiedCount: number }, void>({
      query: () => ({ url: 'notifications/read-all', method: 'PATCH' }),
      invalidatesTags: [
        { type: LoadTag.Notification, id: 'LIST' },
        { type: LoadTag.Notification, id: 'COUNT' },
      ],
    }),

    deleteNotification: build.mutation<void, string>({
      query: (notificationId) => ({ url: `notifications/${notificationId}`, method: 'DELETE' }),
      invalidatesTags: [
        { type: LoadTag.Notification, id: 'LIST' },
        { type: LoadTag.Notification, id: 'COUNT' },
      ],
    }),

    /**
     * SSE stream for real-time notification delivery.
     * Opens an EventSource when the query cache is active, pushes incoming
     * notifications into the cache, and closes on cache entry removal.
     *
     * Uses queryFn to return a placeholder so cacheDataLoaded resolves immediately
     * without making a failing HTTP request (the backend sends SSE format, not JSON).
     */
    streamNotifications: build.query<NotificationStreamPayload | UnreadCountResponse | null, void>({
      queryFn: () => ({ data: null }),
      keepUnusedDataFor: 0,
      async onCacheEntryAdded(_, { updateCachedData, cacheDataLoaded, cacheEntryRemoved }) {
        await cacheDataLoaded

        const es = new EventSource(await withSSEToken('/api/notifications/stream'))

        es.onmessage = (e) => {
          try {
            const payload = JSON.parse(e.data) as NotificationStreamPayload | UnreadCountResponse
            updateCachedData(() => payload)
          } catch {
            // ignore malformed events
          }
        }

        es.onerror = () => {
          es.close()
        }

        // Wait until the cache entry is removed (component unmount)
        await cacheEntryRemoved

        es.close()
      },
    }),
  }),
})

export const {
  useListNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
  useDeleteNotificationMutation,
  useStreamNotificationsQuery,
} = notificationApi
