import type { UserRole } from '../models/enums'


export interface AuthedUser {
  _id: string
  role: UserRole
  firebaseUid: string
  email: string
}

// extra field set by requireAuth
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      firebaseUid?: string
      user?: AuthedUser
    }
  }
}

export {}
