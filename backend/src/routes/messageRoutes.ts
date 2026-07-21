import { Router } from 'express'
import {
  getThread,
  sendMessage,
  markThreadRead,
  getUnreadCounts,
  listThreads,
  streamThread,
} from '../controllers/messageController'
import { requireAuth, requireAuthSSE } from '../middleware/requireAuth'

const router = Router()

// Participant authorization (company owner or assigned driver) is enforced in
// messageService.getThreadContext, since threads have two valid owners and the
// single-owner requireOwns middleware doesn't fit.
router.get('/loads/:loadId/messages', requireAuth, getThread)
router.post('/loads/:loadId/messages', requireAuth, sendMessage)
router.patch('/loads/:loadId/messages/read', requireAuth, markThreadRead)
router.get('/loads/:loadId/messages/stream', requireAuthSSE, streamThread)

router.get('/messages/threads', requireAuth, listThreads)
router.get('/messages/unread-counts', requireAuth, getUnreadCounts)

export default router
