import { Router } from 'express'
import { getBlocklist, blockUser, unblockUser, getKnownUsers } from '../controllers/blocklistController'
import { requireAuth } from '../middleware/requireAuth'
import { requireSelfParam } from '../middleware/authorize'

const router = Router()

// A user manages only their own blocklist. Drivers block companies; companies block drivers
router.get('/blocklist/:userId', requireAuth, requireSelfParam('userId'), getBlocklist)
router.post('/blocklist/:userId', requireAuth, requireSelfParam('userId'), blockUser)
router.delete('/blocklist/:userId/:targetId', requireAuth, requireSelfParam('userId'), unblockUser)
router.get('/blocklist/:userId/known-users', requireAuth, requireSelfParam('userId'), getKnownUsers)

export default router
