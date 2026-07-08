import { Router } from 'express'
import { createUploadUrl } from '../controllers/uploadController'
import { requireAuth } from '../middleware/requireAuth'

const router = Router()

// POST /api/uploads/presign — requires a valid Firebase ID token 
router.post('/uploads/presign', requireAuth, createUploadUrl)

export default router
