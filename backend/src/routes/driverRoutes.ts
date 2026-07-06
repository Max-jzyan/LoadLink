import { Router } from 'express'
import {
  getDriverProfile,
  getRecommendedLoads,
  getDriverRevenue,
  listDriverBids,
  listDriverLoads,
  updateDriverExpenses,
  updateDriverProfile,
} from '../controllers/driverController'
import { requireAuth } from '../middleware/requireAuth'

export const router = Router()

// Driver-specific resources
router.get('/driver/:driverId/bids', listDriverBids)
router.get('/driver/:driverId/loads', listDriverLoads)
router.get('/driver/:driverId/recommended-loads', getRecommendedLoads)
router.get('/driver/:driverId/revenue', requireAuth, getDriverRevenue)
router.get('/driver/:driverId/profile', getDriverProfile)
router.patch('/driver/:driverId/profile', requireAuth, updateDriverProfile)
router.patch('/driver/:driverId/expenses', requireAuth, updateDriverExpenses)

export default router
