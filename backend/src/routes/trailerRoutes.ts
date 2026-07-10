import { Router } from 'express'
import {
  listDriverTrailers,
  getTrailer,
  createTrailer,
  updateTrailer,
  deleteTrailer,
} from '../controllers/trailerController'
import { requireAuth } from '../middleware/requireAuth'
import { requireRole, requireSelfParam } from '../middleware/authorize'
import { USER_ROLES } from '../models/enums'

const router = Router()

const middlewares = [requireAuth, requireRole(USER_ROLES.DRIVER), requireSelfParam('driverId')]

router.get('/driver/:driverId/trailers', middlewares, listDriverTrailers)
router.post('/driver/:driverId/trailers', middlewares, createTrailer)
router.get('/driver/:driverId/trailers/:trailerId', middlewares, getTrailer)
router.patch('/driver/:driverId/trailers/:trailerId', middlewares, updateTrailer)
router.delete('/driver/:driverId/trailers/:trailerId', middlewares, deleteTrailer)

export default router
