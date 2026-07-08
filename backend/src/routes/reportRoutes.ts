import { Router } from 'express'
import {
  createReport,
  getReportsByReporter,
  getAllReports,
  updateReportStatus,
} from '../controllers/reportController'

const router = Router()

router.post('/reports', createReport)
// Admin view — all reports across users
router.get('/reports', getAllReports)
router.get('/reports/user/:userId', getReportsByReporter)
router.patch('/reports/:reportId/status', updateReportStatus)

export default router
