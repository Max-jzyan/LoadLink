import type { Request, Response, NextFunction } from 'express'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { StatusCodes } from 'http-status-codes'
import { ApiError } from '../utils/ApiError'

// extend Express Request so controllers can read req.firebaseUid
declare global {
  namespace Express {
    interface Request {
      firebaseUid?: string
    }
  }
}

let warned = false

function getFirebaseAuth() {
  if (getApps().length) return getAuth()

  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env

  if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
    if (!warned) {
      console.warn(
        '[requireAuth] Firebase admin credentials missing — auth enforcement disabled. ' +
          'Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY in .env to enable.'
      )
      warned = true
    }
    return null
  }

  const app = initializeApp({
    credential: cert({
      projectId: FIREBASE_PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  })

  return getAuth(app)
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const auth = getFirebaseAuth()

  // credentials not configured: skip enforcement in dev
  if (!auth) return next()

  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return next(new ApiError(StatusCodes.UNAUTHORIZED, 'Authorization header required'))
  }

  try {
    const decoded = await auth.verifyIdToken(authHeader.slice(7))
    req.firebaseUid = decoded.uid
    next()
  } catch {
    next(new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid or expired token'))
  }
}
