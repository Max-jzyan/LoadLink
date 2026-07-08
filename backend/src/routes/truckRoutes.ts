import { Router } from 'express'
import {
  listDriverTrucks,
  getTruck,
  createTruck,
  updateTruck,
  deleteTruck,
  setPrimaryTruck,
  updateTruckExpenses,
} from '../controllers/truckController'
import { requireAuth } from '../middleware/requireAuth'
import { requireRole, requireSelfParam } from '../middleware/authorize'
import { USER_ROLES } from '../models/enums'

const router = Router()

// Every truck route is scoped to the authenticated driver's own :driverId.
const middlewares = [requireAuth, requireRole(USER_ROLES.DRIVER), requireSelfParam('driverId')]

router.get('/driver/:driverId/trucks', middlewares, listDriverTrucks)
router.post('/driver/:driverId/trucks', middlewares, createTruck)
router.get('/driver/:driverId/trucks/:truckId', middlewares, getTruck)
router.patch('/driver/:driverId/trucks/:truckId', middlewares, updateTruck)
router.delete('/driver/:driverId/trucks/:truckId', middlewares, deleteTruck)
router.patch('/driver/:driverId/trucks/:truckId/primary', middlewares, setPrimaryTruck)
router.patch('/driver/:driverId/trucks/:truckId/expenses', middlewares, updateTruckExpenses)

export default router
