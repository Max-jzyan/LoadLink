import { Bell, CheckCheck, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import DrawerShell from '@/components/layout/DrawerShell'
import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import {
  notificationApi,
  useGetUnreadCountQuery,
  useListNotificationsQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
  useDeleteNotificationMutation,
  useStreamNotificationsQuery,
  type NotificationStreamPayload,
  type UnreadCountResponse,
} from '@/services/notificationApi/notificationSlice'
import { NOTIFICATION_TYPES, type Notification } from '@/services/notificationApi/notificationEnum'
import { formatDistanceToNow } from 'date-fns'
import { RoutePath } from '@/config/routes'
import { LoadTag } from '@/services/apiTypes'
import type { AppDispatch } from '@/services/store'

// Type guard to distinguish Notification from UnreadCountResponse in SSE stream
function isNotification(
  payload: NotificationStreamPayload | UnreadCountResponse | null
): payload is NotificationStreamPayload {
  return payload !== null && '_id' in payload && 'type' in payload
}

/** Map a notification to a navigation target (route or external URL). */
function resolveNotificationTarget(n: Notification): { path?: string; url?: string } | null {
  const data = n.data as Record<string, unknown>
  const loadId = data?.loadId as string | undefined
  const rcUrl = data?.rateConfirmationUrl as string | undefined
  const bolUrl = data?.bolUrl as string | undefined
  const signedBolUrl = data?.signedBolUrl as string | undefined

  switch (n.type) {
    // Company receives these
    case NOTIFICATION_TYPES.BID_RECEIVED:
      return loadId ? { path: `/loads/${loadId}` } : null
    case NOTIFICATION_TYPES.LOAD_CLAIMED:
      return loadId ? { path: `/loads/${loadId}` } : null
    case NOTIFICATION_TYPES.AUCTION_EXPIRED:
    case NOTIFICATION_TYPES.AUCTION_CANCELLED:
      return { path: RoutePath.CompanyAuctions }
    case NOTIFICATION_TYPES.DRIVER_CHECKED_IN:
      return loadId ? { path: `${RoutePath.Map}?loadId=${loadId}` } : null

    // Driver receives these
    case NOTIFICATION_TYPES.BID_ACCEPTED:
      return loadId ? { path: `${RoutePath.DriverAuctions}/${loadId}` } : null
    case NOTIFICATION_TYPES.BID_REJECTED:
      return loadId ? { path: `${RoutePath.DriverAuctions}/${loadId}` } : null
    case NOTIFICATION_TYPES.LOAD_STATUS_CHANGED:
      return { path: RoutePath.DriverLoads }
    case NOTIFICATION_TYPES.RATE_CONFIRMATION_READY:
      if (rcUrl) return { url: rcUrl }
      return loadId ? { path: `${RoutePath.DriverAuctions}/${loadId}` } : null

    // BOL_READY — sent to both driver AND company at booking
    // Opens the PDF directly (same behaviour as Rate Confirmation)
    case NOTIFICATION_TYPES.BOL_READY:
      if (bolUrl) return { url: bolUrl }
      return loadId ? { path: `/loads/${loadId}` } : null

    // BOL_SIGNED_SUBMITTED — sent to company when driver submits signed copy
    // Navigates to the load detail page where company can review it
    case NOTIFICATION_TYPES.BOL_SIGNED_SUBMITTED:
      if (signedBolUrl) return { url: signedBolUrl }
      return loadId ? { path: `/loads/${loadId}` } : null

    case NOTIFICATION_TYPES.DOCUMENT_APPROVED:
    case NOTIFICATION_TYPES.DOCUMENT_REJECTED:
    case NOTIFICATION_TYPES.DOCUMENT_EXPIRING_SOON:
    case NOTIFICATION_TYPES.DOCUMENT_EXPIRED:
      return { path: RoutePath.DriverProfile }

    // Admin receives these
    case NOTIFICATION_TYPES.DOCUMENT_UPLOADED:
      return { path: RoutePath.AdminDocuments }

    // Either role receives these — the Messages archive lists the thread
    case NOTIFICATION_TYPES.MESSAGE_RECEIVED:
      return { path: RoutePath.Messages }
    case NOTIFICATION_TYPES.REPORT_STATUS_UPDATED:
      return { path: RoutePath.Report }

    default:
      return null
  }
}

function NotificationItem({
  notification,
  onRead,
  onDelete,
  onClose,
}: {
  notification: Notification
  onRead: (id: string) => void
  onDelete: (id: string) => void
  onClose: () => void
}) {
  const navigate = useNavigate()
  const target = resolveNotificationTarget(notification)

  function handleClick() {
    if (!notification.isRead) onRead(notification._id)
    if (!target) return
    if (target.url) {
      window.open(target.url, '_blank', 'noopener,noreferrer')
    } else if (target.path) {
      navigate(target.path)
      onClose()
    }
  }

  return (
    <div
      onClick={handleClick}
      role={target ? 'button' : undefined}
      tabIndex={target ? 0 : undefined}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      className={cn(
        'flex items-start gap-3 rounded-lg p-3 transition-colors',
        !notification.isRead ? 'bg-primary/5 border border-primary/10' : 'hover:bg-muted/50',
        target && 'cursor-pointer'
      )}
      data-tour="notification-bell"
    >
      {/* Unread dot */}
      <div className="mt-1.5 shrink-0">
        {!notification.isRead ? (
          <div className="h-2 w-2 rounded-full bg-primary" />
        ) : (
          <div className="h-2 w-2" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p
          className={cn('text-sm font-medium truncate', !notification.isRead && 'text-foreground')}
        >
          {notification.title}
        </p>
        {notification.message && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {notification.message}
          </p>
        )}
        <p className="text-xs text-muted-foreground/60 mt-1">
          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
        </p>
      </div>

      {/* Action buttons — stop propagation so they don't trigger the row click */}
      <div className="flex shrink-0 gap-1" onClick={(e) => e.stopPropagation()}>
        {!notification.isRead && (
          <button
            onClick={() => onRead(notification._id)}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Mark as read"
          >
            <CheckCheck className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          onClick={() => onDelete(notification._id)}
          className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
          title="Delete"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const dispatch = useDispatch<AppDispatch>()

  // SSE stream for real-time notifications (always active for authenticated users)
  const { data: streamData } = useStreamNotificationsQuery(undefined, {
    // Stream only - no fallback
  })

  // Get initial count and list data
  const { data: countData } = useGetUnreadCountQuery(undefined, {
    // Stream only - no fallback
    refetchOnMountOrArgChange: true,
  })
  const { data: listData, refetch: refetchList } = useListNotificationsQuery(
    { page: 1, limit: 40 },
    {
      skip: !open,
      refetchOnMountOrArgChange: true,
    }
  )

  const [markAsRead] = useMarkAsReadMutation()
  const [markAllAsRead] = useMarkAllAsReadMutation()
  const [deleteNotification] = useDeleteNotificationMutation()

  // Patch the getUnreadCount cache directly so the badge has one source of truth.
  useEffect(() => {
    if (!streamData) return

    dispatch(
      notificationApi.util.updateQueryData('getUnreadCount', undefined, (draft) => {
        if (isNotification(streamData)) {
          draft.unreadCount += 1
        } else {
          draft.unreadCount = streamData.unreadCount
        }
      })
    )

    // A report the current user filed just changed status elsewhere (admin
    // action) — refetch it so an already-open "My Reports" page updates live
    // instead of showing a stale status until the user manually refreshes.
    if (
      isNotification(streamData) &&
      streamData.type === NOTIFICATION_TYPES.REPORT_STATUS_UPDATED
    ) {
      dispatch(notificationApi.util.invalidateTags([{ type: LoadTag.Report }]))
    }
  }, [streamData, dispatch])

  const unreadCount = countData?.unreadCount ?? 0

  // Refetch list when drawer opens
  useEffect(() => {
    if (open) {
      refetchList()
    }
  }, [open, refetchList])

  const notifications = listData?.notifications ?? []

  return (
    <>
      {/* Bell trigger button */}
      <button
        onClick={() => setOpen(true)}
        data-tour="notification-bell"
        className="relative flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification drawer panel */}
      <DrawerShell
        open={open}
        onOpenChange={setOpen}
        direction="right"
        size="sm"
        title={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : 'Notifications'}
        footer={
          unreadCount > 0 ? (
            <Button variant="outline" className="w-full" onClick={() => markAllAsRead()}>
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark all as read
            </Button>
          ) : undefined
        }
      >
        <div className="space-y-1.5">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Bell className="h-10 w-10 mb-3 opacity-20" />
              <p className="text-sm font-medium">No notifications yet</p>
              <p className="text-xs mt-1 opacity-70 text-center">
                You'll see alerts about bids, auctions, messages and documents here.
              </p>
            </div>
          ) : (
            notifications.map((n) => (
              <NotificationItem
                key={n._id}
                notification={n}
                onRead={markAsRead}
                onDelete={deleteNotification}
                onClose={() => setOpen(false)}
              />
            ))
          )}
        </div>
      </DrawerShell>
    </>
  )
}
