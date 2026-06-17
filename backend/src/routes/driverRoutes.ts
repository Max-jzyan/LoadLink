import { Router } from 'express'
import {
  getRecommendedLoads,
  listDriverBids,
  listDriverLoads,
  listDriverTrucks,
} from '../controllers/driverController'

export const router = Router()

// Driver-specific resources
router.get('/driver/:driverId/bids', listDriverBids)
router.get('/driver/:driverId/loads', listDriverLoads)
router.get('/driver/:driverId/recommended-loads', getRecommendedLoads)
router.get('/driver/:driverId/trucks', listDriverTrucks)

export default router
