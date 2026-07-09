import type { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import { ApiError } from '../utils/ApiError'
import { UserModel } from '../models/users/User'
import { getFirebaseAuth } from '../lib/firebaseAdmin'
import type { UserRole } from '../models/enums'
import '../types/auth'

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
    console.error('[requireAuth] token verification failed:', err)
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

  const user = await UserModel.findOne({ firebaseUid }).select('_id role firebaseUid email')
  if (!user) {
    return new ApiError(StatusCodes.FORBIDDEN, 'User not registered')
  }
  req.user = {
    _id: user._id.toString(),
    role: user.get('role') as UserRole,
    firebaseUid: user.firebaseUid,
    email: user.email,
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
