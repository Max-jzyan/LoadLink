import { Router } from 'express'
import { listCompanies, getCompanyDashboard } from '../controllers/companyController'
import { requireAuth } from '../middleware/requireAuth'
import { requireRole, requireSelfParam } from '../middleware/authorize'
import { USER_ROLES } from '../models/enums'

const router = Router()

router.get('/companies', requireAuth, requireRole(USER_ROLES.COMPANY), listCompanies)
router.get('/company/:companyId/dashboard', requireAuth, requireRole(USER_ROLES.COMPANY), requireSelfParam('companyId'), getCompanyDashboard)

export default router
