import type { UserRole } from '@/hooks/useRole'

export interface RegisterUserPayload {
  firebaseUid: string
  name: string
  email: string | null
  role: UserRole
}

export interface RegisterUserResponse {
  _id: string
  role: UserRole
}
