import { Router } from 'express'
import {
  getDriverProfile,
  getRecommendedLoads,
  getDriverRevenue,
  getScoredLoads,
  listDriverBids,
  listDriverLoads,
  updateDriverExpenses,
  updateDriverProfile,
} from '../controllers/driverController'
import { requireAuth } from '../middleware/requireAuth'
import { requireRole, requireSelfParam } from '../middleware/authorize'
import { USER_ROLES } from '../models/enums'

export const router = Router()

const middlewares = [requireAuth, requireRole(USER_ROLES.DRIVER), requireSelfParam('driverId')]

router.get('/driver/:driverId/bids', middlewares, listDriverBids)
router.get('/driver/:driverId/loads', middlewares, listDriverLoads)
router.get('/driver/:driverId/recommended-loads', middlewares, getRecommendedLoads)
router.get('/driver/:driverId/loads/scored', middlewares, getScoredLoads)
router.get('/driver/:driverId/revenue', middlewares, getDriverRevenue)
router.patch('/driver/:driverId/profile', middlewares, updateDriverProfile)
router.patch('/driver/:driverId/expenses', middlewares, updateDriverExpenses)
router.get('/driver/:driverId/profile', requireAuth, getDriverProfile)

export default router
