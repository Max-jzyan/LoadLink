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
import { requireAuth } from '../middleware/requireAuth'

const router = Router()

router.get('/loads', listAvailableLoads)
router.get('/loads/stream', streamNewLoads)

router.get('/company/:companyId/loads', listCompanyLoads)
router.post('/company/:companyId/loads', createLoad)

router.get('/loads/:loadId', getLoad)
router.patch('/loads/:loadId', updateLoad)
router.patch('/loads/:loadId/expenses', requireAuth, updateLoadExpenses)

export default router
