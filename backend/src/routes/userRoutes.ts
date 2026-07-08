import { Router } from 'express'
import { requireAuth, requireFirebaseToken } from '../middleware/requireAuth'
import {
  registerUser,
  getMe,
  getFeedPreferences,
  updateFeedPreferences,
} from '../controllers/userController'

const router = Router()

// POST /api/users/register is called only once after Firebase signup
router.post('/users/register', requireFirebaseToken, registerUser)

// GET /api/users/me
router.get('/users/me', requireAuth, getMe)

// Feed preferences (blocklist-driven feed filtering)
router.get('/users/:userId/feed-preferences', getFeedPreferences)
router.patch('/users/:userId/feed-preferences', updateFeedPreferences)

export default router
