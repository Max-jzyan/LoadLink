import { Router } from 'express'
import {
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from '../controllers/notificationController'
import { requireAuth } from '../middleware/requireAuth'

const router = Router()

// All notification routes require authentication.
router.use(requireAuth)

router.get('/notifications', listNotifications)
router.get('/notifications/unread-count', getUnreadCount)
router.patch('/notifications/read-all', markAllAsRead)
router.patch('/notifications/:notificationId/read', markAsRead)
router.delete('/notifications/:notificationId', deleteNotification)

export default router
