import { Router } from 'express'
import {
  getLoad,
  getAcceptedBid,
  createLoad,
  updateLoad,
  updateLoadStatus,
  updateLoadExpenses,
  listCompanyLoads,
  listAvailableLoads,
  streamNewLoads,
  selectTruckForLoad,
} from '../controllers/loadController'
import { requireAuth, requireAuthSSE } from '../middleware/requireAuth'
import {
  requireRole,
  requireSelfParam,
  requireOwns,
  canViewLoad,
  notBlockedByLoadCompany,
  companyOwnsLoad,
  driverOwnsAssignedLoad,
} from '../middleware/authorize'
import { USER_ROLES } from '../models/enums'

const router = Router()

router.get('/loads', requireAuth, listAvailableLoads)
router.get('/loads/stream', requireAuthSSE, streamNewLoads)
router.get('/loads/:loadId', requireAuth, canViewLoad, notBlockedByLoadCompany, getLoad)
router.get(
  '/loads/:loadId/accepted-bid',
  requireAuth,
  canViewLoad,
  notBlockedByLoadCompany,
  getAcceptedBid
)

router.get(
  '/company/:companyId/loads',
  requireAuth,
  requireRole(USER_ROLES.COMPANY),
  requireSelfParam('companyId'),
  listCompanyLoads
)
router.post(
  '/company/:companyId/loads',
  requireAuth,
  requireRole(USER_ROLES.COMPANY),
  requireSelfParam('companyId'),
  createLoad
)

router.patch(
  '/loads/:loadId',
  requireAuth,
  requireRole(USER_ROLES.COMPANY),
  requireOwns(companyOwnsLoad),
  updateLoad
)

// Driver-specific load status updates - only the assigned driver can update
router.patch(
  '/driver/:driverId/loads/:loadId/status',
  requireAuth,
  requireRole(USER_ROLES.DRIVER),
  requireSelfParam('driverId'),
  updateLoadStatus
)

router.patch(
  '/loads/:loadId/expenses',
  requireAuth,
  requireRole(USER_ROLES.DRIVER),
  requireOwns(driverOwnsAssignedLoad),
  updateLoadExpenses
)
router.patch(
  '/loads/:loadId/select-truck',
  requireAuth,
  requireRole(USER_ROLES.DRIVER),
  requireOwns(driverOwnsAssignedLoad),
  selectTruckForLoad
)

export default router
