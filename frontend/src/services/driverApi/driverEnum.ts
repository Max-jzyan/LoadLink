export interface PlaceBidPayload {
  driverId: string
  amount: number
}

export interface ClaimLoadPayload {
  driverId: string
}

export interface ClaimResult {
  loadId: string
  finalPayout: number
  rateConfirmationUrl: string
}

export interface Bid {
  _id: string
  loadId: string
  auctionId: string
  driverId: string
  amount: number
  status: string
  acceptedAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface Truck {
  _id: string
  ownerDriverId: string
  make: string
  model: string
  year: number
  truckType: string
  trailerLengthFt: number
  capacityLbs: number
  maxPayloadLbs: number
  plateNumber: string
  vin: string
  certifications: string[]
  isPrimary: boolean
  notes: string
  createdAt: string
  updatedAt: string
}

export interface PricingPreferences {
  minimumRatePerMile: number
  minimumLoadValue: number
  preferredMaxDeadheadMiles: number
}

export interface NotificationPreferences {
  email: boolean
  sms: boolean
  workNotifications: boolean
}

export interface HomeLocation {
  city: string
  province: string
  country: string
}

export interface RatingCategories {
  timeliness: number
  communication: number
  reliability: number
  professionalism: number
  documentationAccuracy: number
}

export const categoryLabels: { key: keyof RatingCategories; label: string }[] = [
  { key: 'timeliness', label: 'Timeliness' },
  { key: 'communication', label: 'Communication' },
  { key: 'reliability', label: 'Reliability' },
  { key: 'professionalism', label: 'Professionalism' },
  { key: 'documentationAccuracy', label: 'Doc. Accuracy' },
]

export interface RatingSummary {
  average: number
  totalReviews: number
  categories: RatingCategories
  lastUpdatedAt: string | null
}

export interface DriverProfile {
  _id: string
  firebaseUid: string
  name: string
  email: string
  phone: string
  role: string
  professionalTitle: string
  profilePictureUrl: string
  trucks: Truck[]
  certifications: string[]
  availableForLoads: boolean
  pricingPreferences: PricingPreferences
  notificationPreferences: NotificationPreferences
  homeLocation: HomeLocation
  ratingSummary: RatingSummary
  completedLoadsCount: number
  lastActiveAt: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateTruckPayload {
  make: string
  model: string
  year: number
  truckType: string
  trailerLengthFt: number
  capacityLbs: number
  maxPayloadLbs?: number
  plateNumber: string
  vin?: string
  certifications?: string[]
  isPrimary?: boolean
  notes?: string
}

export interface UpdateTruckPayload extends Partial<CreateTruckPayload> {}

export interface UpdateDriverProfilePayload {
  name?: string
  professionalTitle?: string
  profilePictureUrl?: string
  phone?: string
  homeLocation?: Partial<HomeLocation>
  pricingPreferences?: Partial<PricingPreferences>
  notificationPreferences?: Partial<NotificationPreferences>
  availableForLoads?: boolean
}
