import { api } from '../api'
import { LoadTag } from '../apiTypes'
import type { NotificationListResponse, UnreadCountResponse } from './notificationEnum'

export type { Notification, NotificationListResponse, UnreadCountResponse, NotificationType } from './notificationEnum'
export { NOTIFICATION_TYPES } from './notificationEnum'

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
  }),
})

export const {
  useListNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
  useDeleteNotificationMutation,
} = notificationApi
