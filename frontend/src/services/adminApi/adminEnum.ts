export interface PlatformStats {
  totalDrivers: number
  totalCompanies: number
  totalLoads: number
  totalBids: number
  driversWithDocs: number
  totalRevenue: number
}

/** A single day's value in an analytics time series. */
export interface AnalyticsPoint {
  date: string // 'YYYY-MM-DD' (UTC)
  value: number
}

export type AnalyticsMetricKey = 'revenue' | 'loads' | 'bids' | 'newDrivers' | 'newCompanies'

export interface AnalyticsResponse {
  days: number
  series: Record<AnalyticsMetricKey, AnalyticsPoint[]>
}

export interface TopCompany {
  _id: string
  name: string
  totalRevenue: number
  loadCount: number
}

export interface TopDriver {
  _id: string
  name: string
  totalRevenue: number
  bidCount: number
}

export interface TopLane {
  origin: string
  destination: string
  count: number
}

export interface ActivityStats {
  totalUsers: number
  activeLast24h: number
  activeLast7d: number
  activeLast30d: number
  lastActiveDistribution: AnalyticsPoint[]
}

export interface AdminInsights {
  topCompanies: TopCompany[]
  topDrivers: TopDriver[]
  topLanes: TopLane[]
  activity: ActivityStats
}

export interface AdminUser {
  _id: string
  name: string
  email: string
  phone?: string
  role: string
  createdAt: string
  lastActiveAt: string | null
  profilePictureUrl: string
  isBanned: boolean
  bannedAt: string | null
  bannedReason: string
  bannedBy?: string | null
}

export interface InsuranceCert {
  insurer: string
  policyNumber: string
  expiresAt: string
  url: string
  key: string
  uploadedAt: string
  verificationStatus?: 'pending' | 'approved' | 'rejected'
  reviewNotes?: string
}

export interface CertDoc {
  name: string
  url: string
  key: string
  uploadedAt: string
  expiresAt?: string | null
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
        commodity: string
      }
    | string
  driverId: { _id: string; name: string; email: string } | string
  amount: number
  acceptedAt: string | null
  rateConfirmationUrl: string | null
  rateConfirmationKey: string | null
}

export interface BillOfLadingBid {
  _id: string
  loadId:
    | {
        _id: string
        originAddress: string
        destinationAddress: string
        pickupTime: string
        dropoffTime: string
        commodity: string
      }
    | string
  driverId: { _id: string; name: string; email: string } | string
  amount: number
  acceptedAt: string | null
  bolUrl: string | null
  bolKey: string | null
  signedBolUrl: string | null
  signedBolKey: string | null
}
