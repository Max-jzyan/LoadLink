import { Router } from 'express'
import { createUploadUrl } from '../controllers/uploadController'
import { requireFirebaseToken } from '../middleware/requireAuth'

const router = Router()

// POST /api/uploads/presign — requires a valid Firebase ID token
router.post('/uploads/presign', requireFirebaseToken, createUploadUrl)

export default router
