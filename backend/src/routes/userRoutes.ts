import { Router } from 'express'
import { requireAuth, requireFirebaseToken } from '../middleware/requireAuth'
import {
  registerUser,
  getMe,
  getFeedPreferences,
  updateFeedPreferences,
  getMyProfile,
  updateMyProfile
} from '../controllers/userController'

const router = Router()

// POST /api/users/register is called only once after Firebase signup
router.post('/users/register', requireFirebaseToken, registerUser)

// GET /api/users/me
router.get('/users/me', requireAuth, getMe)

// Feed preferences (blocklist-driven feed filtering)
router.get('/users/:userId/feed-preferences', getFeedPreferences)
router.patch('/users/:userId/feed-preferences', updateFeedPreferences)

// GET  /api/users/me/profile — requires auth; returns the full user profile (role-agnostic)
router.get('/users/me/profile', requireAuth, getMyProfile)

// PATCH /api/users/me/profile — updates universal profile fields
router.patch('/users/me/profile', requireAuth, updateMyProfile)

export default router