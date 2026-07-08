import type { UserRole } from '@/types/enums'
import type { UploadedDocument } from '@/lib/uploadDocuments'

export interface RegisterUserPayload {
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
