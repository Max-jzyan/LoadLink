import { Router } from 'express'
import { getBlocklist, blockUser, unblockUser } from '../controllers/blocklistController'

const router = Router()

// Drivers block companies; companies block drivers
router.get('/blocklist/:userId', getBlocklist)
router.post('/blocklist/:userId', blockUser)
router.delete('/blocklist/:userId/:targetId', unblockUser)

export default router
