import { Router } from 'express'
import {
  createReview,
  getReviewsForTarget,
  getReview,
  deleteReview,
} from '../controllers/reviewController'

const router = Router()

// Reviews can be created by drivers reviewing companies, or companies reviewing drivers
router.post('/reviews', createReview)
router.get('/reviews/target/:targetId', getReviewsForTarget)
router.get('/reviews/:reviewId', getReview)
router.delete('/reviews/:reviewId', deleteReview)

export default router
