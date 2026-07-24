import type { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import { ApiError } from '../utils/ApiError'
import { UserModel } from '../models/users/User'
import { getFirebaseAuth } from '../lib/firebaseAdmin'
import type { UserRole } from '../models/enums'
import '../types/auth'

/**
 * Minimum gap between writes to `lastActiveAt`. Every authenticated request
 * would otherwise trigger a write; throttling keeps the "last active" value
 * meaningfully real (updated on genuine logins/usage) without hammering the
 * database on rapid-fire requests within the same session.
 */
const LAST_ACTIVE_THROTTLE_MS = 5 * 60 * 1000

// verify firebase only. used for registration
export async function requireFirebaseToken(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const auth = getFirebaseAuth()
  if (!auth) {
    return next(new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Auth is not configured'))
  }

  const authHeader = req.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    return next(new ApiError(StatusCodes.UNAUTHORIZED, 'Authorization header required'))
  }

  try {
    const decoded = await auth.verifyIdToken(authHeader.slice(7))
    req.firebaseUid = decoded.uid
    next()
  } catch (err) {
    next(new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid or expired token'))
  }
}

// helper for firebase + mongo auth
async function authenticate(req: Request, token: string): Promise<ApiError | null> {
  const auth = getFirebaseAuth()
  if (!auth) {
    return new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Auth is not configured')
  }

  let firebaseUid: string
  try {
    const decoded = await auth.verifyIdToken(token)
    firebaseUid = decoded.uid
  } catch {
    return new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid or expired token')
  }

  req.firebaseUid = firebaseUid

  const user = await UserModel.findOne({ firebaseUid }).select(
    '_id role firebaseUid email isBanned bannedReason lastActiveAt'
  )
  if (!user) {
    return new ApiError(StatusCodes.FORBIDDEN, 'User not registered')
  }

  if (user.isBanned) {
    return new ApiError(
      StatusCodes.FORBIDDEN,
      user.bannedReason
        ? `Your account has been suspended: ${user.bannedReason}`
        : 'Your account has been suspended. Please contact support.',
      'ACCOUNT_BANNED'
    )
  }

  req.user = {
    _id: user._id.toString(),
    role: user.get('role') as UserRole,
    firebaseUid: user.firebaseUid,
    email: user.email,
  }

  // Fire-and-forget, throttled write of the real "last active"/"last logged in"
  // timestamp. Not awaited so it never adds latency to the request itself.
  const lastActiveAt = user.lastActiveAt
  const now = Date.now()
  if (!lastActiveAt || now - new Date(lastActiveAt).getTime() > LAST_ACTIVE_THROTTLE_MS) {
    UserModel.updateOne({ _id: user._id }, { $set: { lastActiveAt: new Date() } }).catch((err) => {
      console.error('[requireAuth] Failed to update lastActiveAt:', err)
    })
  }

  return null
}

// verify with firebase + mongo
export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return next(new ApiError(StatusCodes.UNAUTHORIZED, 'Authorization header required'))
  }

  try {
    const err = await authenticate(req, authHeader.slice(7))
    next(err ?? undefined)
  } catch (err) {
    next(err)
  }
}

// SSE verify with firebase + mongo
export async function requireAuthSSE(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const token = req.query.access_token as string | undefined

  if (!token) {
    return next(new ApiError(StatusCodes.UNAUTHORIZED, 'Authorization required'))
  }

  try {
    const err = await authenticate(req, token)
    next(err ?? undefined)
  } catch (err) {
    next(err)
  }
}
