import { Router } from 'express'
import {
  getLoad,
  createLoad,
  updateLoad,
  listCompanyLoads,
  listAvailableLoads,
  streamNewLoads,
} from '../controllers/loadController'

const router = Router()

router.get('/loads', listAvailableLoads)
router.get('/loads/stream', streamNewLoads)

router.get('/company/:companyId/loads', listCompanyLoads)
router.post('/company/:companyId/loads', createLoad)

router.get('/loads/:loadId', getLoad)
router.patch('/loads/:loadId', updateLoad)

export default router
