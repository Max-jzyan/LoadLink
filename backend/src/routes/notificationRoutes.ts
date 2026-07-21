import { Router } from 'express'
import {
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  streamNotifications,
} from '../controllers/notificationController'
import { requireAuth, requireAuthSSE } from '../middleware/requireAuth'

const router = Router()

// SSE stream for real-time notifications (uses token via query param)
// Must be defined BEFORE the router.use(requireAuth) middleware
router.get('/notifications/stream', requireAuthSSE, streamNotifications)

// All other notification routes require authentication via header.
// Scoped to /notifications: an unscoped router.use(requireAuth) would also run
// for every later-mounted /api router (e.g. the messages SSE stream, which
// authenticates via query param and 401s on the missing header).
router.use('/notifications', requireAuth)

router.get('/notifications', listNotifications)
router.get('/notifications/unread-count', getUnreadCount)
router.patch('/notifications/read-all', markAllAsRead)
router.patch('/notifications/:notificationId/read', markAsRead)
router.delete('/notifications/:notificationId', deleteNotification)

export default router
