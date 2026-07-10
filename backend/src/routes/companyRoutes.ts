import { Router } from 'express'
import { listCompanies, getCompanyDashboard } from '../controllers/companyController'
import { generateRateConfirmation } from '../controllers/adminController'
import { requireAuth } from '../middleware/requireAuth'
import { requireRole, requireSelfParam } from '../middleware/authorize'
import { USER_ROLES } from '../models/enums'

const router = Router()

router.get('/companies', requireAuth, requireRole(USER_ROLES.COMPANY), listCompanies)
router.get(
  '/company/:companyId/dashboard',
  requireAuth,
  requireRole(USER_ROLES.COMPANY),
  requireSelfParam('companyId'),
  getCompanyDashboard
)

// Company can manually (re-)generate a rate confirmation PDF for one of their loads.
router.post(
  '/company/:companyId/loads/:loadId/bids/:bidId/rate-confirmation',
  requireAuth,
  requireRole(USER_ROLES.COMPANY),
  requireSelfParam('companyId'),
  generateRateConfirmation
)

export default router
