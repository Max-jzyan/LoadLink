import { Router } from 'express'
import { listCompanies, getCompanyDashboard } from '../controllers/companyController'

const router = Router()

// dev-only endpoint: lists all companies (no auth guard)
// replace with auth middleware once firebase is wired up
router.get('/companies', listCompanies)

// enriched dashboard payload: loads + per-load bid counts + summary stats
router.get('/company/:companyId/dashboard', getCompanyDashboard)

export default router
