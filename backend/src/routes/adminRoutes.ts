import { Router } from 'express'
import {
  getPlatformStats,
  getAdminAnalytics,
  getAdminInsights,
  listUsers,
  banUser,
  unbanUser,
  deleteUser,
  listDrivers,
  getDriverDocuments,
  approveInsuranceCert,
  rejectInsuranceCert,
  approveCertDoc,
  rejectCertDoc,
  listRateConfirmations,
  listBillsOfLading,
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
router.get('/admin/analytics', adminOnly, getAdminAnalytics)
router.get('/admin/insights', adminOnly, getAdminInsights)

router.get('/admin/users', adminOnly, listUsers)
router.patch('/admin/users/:userId/ban', adminOnly, banUser)
router.patch('/admin/users/:userId/unban', adminOnly, unbanUser)
router.delete('/admin/users/:userId', adminOnly, deleteUser)

router.get('/admin/drivers', adminOnly, listDrivers)
router.get('/admin/drivers/:driverId', adminOnly, getDriverDocuments)
router.patch('/admin/drivers/:driverId/insurance/:idx/approve', adminOnly, approveInsuranceCert)
router.patch('/admin/drivers/:driverId/insurance/:idx/reject', adminOnly, rejectInsuranceCert)
router.patch('/admin/drivers/:driverId/certdoc/:idx/approve', adminOnly, approveCertDoc)
router.patch('/admin/drivers/:driverId/certdoc/:idx/reject', adminOnly, rejectCertDoc)

router.get('/admin/documents/download', adminOnly, getDocumentDownloadUrl)
router.get('/admin/rate-confirmations', adminOnly, listRateConfirmations)
router.get('/admin/bill-of-ladings', adminOnly, listBillsOfLading)
router.post(
  '/admin/loads/:loadId/bids/:bidId/rate-confirmation',
  adminOnly,
  generateRateConfirmation
)

export default router
