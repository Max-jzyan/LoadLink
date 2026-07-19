import { Router } from 'express'
import {
  createReport,
  getReportCollaborators,
  getReportLoads,
  getReportsByReporter,
  getAllReports,
  updateReportStatus,
} from '../controllers/reportController'
import { requireAuth } from '../middleware/requireAuth'
import { requireRole, requireSelfParam } from '../middleware/authorize'
import { USER_ROLES } from '../models/enums'

const router = Router()

const adminOnly = [requireAuth, requireRole(USER_ROLES.ADMIN)]

router.post('/reports', requireAuth, createReport)
router.get('/reports/collaborators', requireAuth, getReportCollaborators)
router.get('/reports/loads', requireAuth, getReportLoads)
// Admin view — all reports across users
router.get('/reports', adminOnly, getAllReports)
router.get('/reports/user/:userId', requireAuth, requireSelfParam('userId'), getReportsByReporter)
router.patch('/reports/:reportId/status', adminOnly, updateReportStatus)

export default router
