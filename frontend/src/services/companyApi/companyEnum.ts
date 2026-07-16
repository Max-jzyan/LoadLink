import type { MyProfile, NotificationPreferences } from '../userApi/userEnum'
import type { RatingSummary } from '../driverApi/driverEnum'

export interface BusinessDocument {
  name: string
  url: string
  key: string
  uploadedAt: string
}

// Company-specific profile returned by GET /company/:companyId/profile
export interface CompanyProfile extends MyProfile {
  companyName: string
  contactName: string
  businessAddress: string
  businessNumber: string
  businessDocuments: BusinessDocument[]
  ratingSummary: RatingSummary
  postedLoadsCount: number
}

export interface UpdateCompanyProfilePayload {
  companyName?: string
  contactName?: string
  businessAddress?: string
  businessNumber?: string
  businessDocuments?: BusinessDocument[]
  profilePictureUrl?: string
  phone?: string
  name?: string
  notificationPreferences?: Partial<NotificationPreferences>
}
