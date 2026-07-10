export interface PlatformStats {
  totalDrivers: number
  totalCompanies: number
  totalLoads: number
  totalBids: number
  driversWithDocs: number
}

export interface AdminUser {
  _id: string
  name: string
  email: string
  role: string
  createdAt: string
  lastActiveAt: string | null
  profilePictureUrl: string
}

export interface InsuranceCert {
  insurer: string
  policyNumber: string
  expiresAt: string
  url: string
  key: string
  uploadedAt: string
}

export interface CertDoc {
  name: string
  url: string
  key: string
  uploadedAt: string
  verificationStatus?: 'pending' | 'approved' | 'rejected'
  reviewNotes?: string
}

export interface AdminDriver {
  _id: string
  name: string
  email: string
  mcNumber: string
  dotNumber: string
  nscCvorNumber?: string
  insuranceCertificates: InsuranceCert[]
  certificationDocuments: CertDoc[]
  createdAt: string
}

export interface RateConfirmationBid {
  _id: string
  loadId:
    | {
        _id: string
        originAddress: string
        destinationAddress: string
        pickupTime: string
        dropoffTime: string
      }
    | string
  driverId: { _id: string; name: string; email: string } | string
  amount: number
  acceptedAt: string | null
  rateConfirmationUrl: string | null
  rateConfirmationKey: string | null
}
