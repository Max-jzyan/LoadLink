import { Router } from 'express'
import {
  createReview,
  getReviewsForTarget,
  getReview,
  deleteReview,
} from '../controllers/reviewController'
import { requireAuth } from '../middleware/requireAuth'
import { requireRole, requireOwns, reviewOwnedByCaller } from '../middleware/authorize'
import { USER_ROLES } from '../models/enums'

const router = Router()
// Reviews can be created by drivers reviewing companies, or companies reviewing drivers
router.post('/reviews', requireAuth, createReview)
router.get('/reviews/target/:targetId', requireAuth, getReviewsForTarget)
router.get('/reviews/:reviewId', requireAuth, getReview)
router.delete('/reviews/:reviewId', requireAuth, requireOwns(reviewOwnedByCaller), deleteReview)

export default router
