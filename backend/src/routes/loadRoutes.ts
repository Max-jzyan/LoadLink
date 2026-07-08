import { Router } from 'express'
import {
  getLoad,
  createLoad,
  updateLoad,
  updateLoadExpenses,
  listCompanyLoads,
  listAvailableLoads,
  streamNewLoads,
} from '../controllers/loadController'
import { requireAuth, requireAuthSSE } from '../middleware/requireAuth'
import {
  requireRole,
  requireSelfParam,
  requireOwns,
  companyOwnsLoad,
  driverOwnsAssignedLoad,
} from '../middleware/authorize'
import { USER_ROLES } from '../models/enums'

const router = Router()

router.get('/loads', requireAuth, listAvailableLoads)
router.get('/loads/stream', requireAuthSSE, streamNewLoads)
router.get('/loads/:loadId', requireAuth, getLoad)

router.get('/company/:companyId/loads', requireAuth, requireRole(USER_ROLES.COMPANY), requireSelfParam('companyId'), listCompanyLoads)
router.post('/company/:companyId/loads', requireAuth, requireRole(USER_ROLES.COMPANY), requireSelfParam('companyId'), createLoad)

router.patch('/loads/:loadId', requireAuth, requireRole(USER_ROLES.COMPANY), requireOwns(companyOwnsLoad), updateLoad)

router.patch('/loads/:loadId/expenses', requireAuth, requireRole(USER_ROLES.DRIVER), requireOwns(driverOwnsAssignedLoad), updateLoadExpenses)

export default router
