import type { MyProfile } from '../userApi/userEnum'

// Company-specific profile returned by the discriminator when role === 'company'
export interface CompanyProfile extends MyProfile {
  companyName: string
  contactName: string
  businessAddress: string
  businessNumber: string
  postedLoadsCount: number
}
