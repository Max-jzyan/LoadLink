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

export interface NotificationPreferences {
  email: boolean
  sms: boolean
  workNotifications: boolean
}

// Base profile fields shared by both Driver and Company roles,
// returned by GET /api/users/me/profile (auth via Bearer token)
export interface MyProfile {
  _id: string
  firebaseUid: string
  name: string
  email: string
  phone: string
  role: string
  profilePictureUrl: string
  notificationPreferences: NotificationPreferences
  lastActiveAt: string | null
  createdAt: string
  updatedAt: string
}
