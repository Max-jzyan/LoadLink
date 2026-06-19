import { Router } from 'express'
import { listCompanies, getCompanyDashboard } from '../controllers/companyController'
import { requireAuth } from '../middleware/requireAuth'

const router = Router()

// dev-only endpoint: lists all companies (no auth guard)
router.get('/companies', listCompanies)

// auth-guarded: verifies Firebase token and checks caller owns the requested companyId
router.get('/company/:companyId/dashboard', requireAuth, getCompanyDashboard)

export default router
