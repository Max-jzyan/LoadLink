import { Router } from 'express'
import {
  registerUser,
  getMe,
  getFeedPreferences,
  updateFeedPreferences,
} from '../controllers/userController'

const router = Router()

// POST /api/users/register iz called only once after Firebase signup
router.post('/users/register', registerUser)

// GET  /api/users/me?firebaseUid=<uid> resolves Firebase UID tp a MongoDB doc
router.get('/users/me', getMe)

// Feed preferences (blocklist-driven feed filtering)
router.get('/users/:userId/feed-preferences', getFeedPreferences)
router.patch('/users/:userId/feed-preferences', updateFeedPreferences)

export default router
