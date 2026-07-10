import { Router } from 'express'
import {
  getPlatformStats,
  listUsers,
  listDrivers,
  getDriverDocuments,
  approveInsuranceCert,
  rejectInsuranceCert,
  approveCertDoc,
  rejectCertDoc,
  listRateConfirmations,
  generateRateConfirmation,
  getAdminProfile,
  getDocumentDownloadUrl,
} from '../controllers/adminController'
import { requireAuth } from '../middleware/requireAuth'
import { requireRole } from '../middleware/authorize'
import { USER_ROLES } from '../models/enums'

const router = Router()

const adminOnly = [requireAuth, requireRole(USER_ROLES.ADMIN)]

router.get('/admin/me', adminOnly, getAdminProfile)
router.get('/admin/stats', adminOnly, getPlatformStats)

router.get('/admin/users', adminOnly, listUsers)

router.get('/admin/drivers', adminOnly, listDrivers)
router.get('/admin/drivers/:driverId', adminOnly, getDriverDocuments)
router.patch('/admin/drivers/:driverId/insurance/:idx/approve', adminOnly, approveInsuranceCert)
router.patch('/admin/drivers/:driverId/insurance/:idx/reject', adminOnly, rejectInsuranceCert)
router.patch('/admin/drivers/:driverId/certdoc/:idx/approve', adminOnly, approveCertDoc)
router.patch('/admin/drivers/:driverId/certdoc/:idx/reject', adminOnly, rejectCertDoc)

router.get('/admin/documents/download', adminOnly, getDocumentDownloadUrl)
router.get('/admin/rate-confirmations', adminOnly, listRateConfirmations)
router.post(
  '/admin/loads/:loadId/bids/:bidId/rate-confirmation',
  adminOnly,
  generateRateConfirmation
)

export default router
