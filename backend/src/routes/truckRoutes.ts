import { Router } from 'express'
import {
  listDriverTrucks,
  getTruck,
  createTruck,
  updateTruck,
  deleteTruck,
  setPrimaryTruck,
} from '../controllers/truckController'

const router = Router()

// Full CRUD for a driver's truck fleet
router.get('/driver/:driverId/trucks', listDriverTrucks)
router.post('/driver/:driverId/trucks', createTruck)
router.get('/driver/:driverId/trucks/:truckId', getTruck)
router.patch('/driver/:driverId/trucks/:truckId', updateTruck)
router.delete('/driver/:driverId/trucks/:truckId', deleteTruck)
router.patch('/driver/:driverId/trucks/:truckId/primary', setPrimaryTruck)

export default router
