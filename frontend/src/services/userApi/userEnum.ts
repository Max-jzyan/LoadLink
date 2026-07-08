import type { UserRole } from '@/hooks/useRole'
import type { UploadedDocument } from '@/lib/uploadDocuments'

export interface RegisterUserPayload {
  firebaseUid: string
  name: string
  email: string | null
  role: UserRole
  certificationDocuments?: UploadedDocument[]
  businessDocuments?: UploadedDocument[]
}

export interface RegisterUserResponse {
  _id: string
  role: UserRole
}
