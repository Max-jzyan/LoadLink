import type { MyProfile, NotificationPreferences } from '../userApi/userEnum'
export interface CertificationDocument {
  name: string
  url: string
  key: string
  uploadedAt: string
}

export interface PlaceBidPayload {
  driverId: string
  amount: number
  selectedTruckId?: string
}

export interface ClaimLoadPayload {
  driverId: string
  selectedTruckId?: string
}

export interface ClaimResult {
  loadId: string
  driverId: string
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

export interface TruckExpensePreferences {
  fuelCostPerLiter: number | null
  fuelEfficiencyKmPerLiter: number | null
  insurancePerMonth: number
  maintenancePerKm: number | null
  otherFixedCostsPerMonth: number | null
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
  expensePreferences: TruckExpensePreferences
  notes: string
  createdAt: string
  updatedAt: string
}

export interface PricingPreferences {
  minimumRatePerMile: number
  minimumLoadValue: number
  preferredMaxDeadheadMiles: number
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

export const RATING_CATEGORIES_COUNT = 5

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

export interface DriverProfile extends MyProfile {
  professionalTitle: string
  trucks: Truck[]
  certifications: string[]
  certificationDocuments: CertificationDocument[]
  availableForLoads: boolean
  pricingPreferences: PricingPreferences
  homeLocation: HomeLocation
  ratingSummary: RatingSummary
  completedLoadsCount: number
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
  expensePreferences?: Partial<TruckExpensePreferences>
}

export interface UpdateTruckPayload extends Partial<CreateTruckPayload> {
  expensePreferences?: Partial<TruckExpensePreferences>
}

export interface ExpensePreferences {
  fuelCostPerLiter: number
  fuelEfficiencyKmPerLiter: number
  maintenancePerKm: number
  otherFixedCostsPerMonth: number
}

export type DashboardViewMode = 'completed' | 'potential'

export interface LoadRevenue {
  loadId: string
  status?: string
  originAddress: string
  destinationAddress: string
  distanceKm: number
  payout: number
  fuelCost: number
  maintenanceCost: number
  totalExpenses: number
  netProfit: number
  deliveryDate: string
  completedAt: string
  effectiveFuelCostPerLiter: number
  effectiveFuelEfficiencyKmPerLiter: number
  effectiveMaintenancePerKm: number
  effectiveInsurancePerMonth: number
  selectedTruckId: string | null
  selectedTruckName: string | null
}

import { type DateRange } from 'react-day-picker'

export interface ExpenseOverrideFields {
  fuelCostPerLiter?: number | null
  fuelEfficiencyKmPerLiter?: number | null
  maintenancePerKm?: number | null
}

export interface RevenueFilters {
  dateRange?: DateRange
  truckType: string
  selectedTruck: string
  minPayout: number | null
  maxPayout: number | null
  origin: string
  destination: string
  minDistance: number | null
  maxDistance: number | null
}

export interface RevenueFiltersQuery {
  dateRange: {
    from?: string
    to?: string
  }
  status?: string
  truckType: string
  selectedTruck: string
  minPayout: number | null
  maxPayout: number | null
  origin: string
  destination: string
  minDistance: number | null
  maxDistance: number | null
}

export interface RevenueSummary {
  totalRevenue: number
  totalExpenses: number
  netProfit: number
  profitMargin: number
  totalDistanceKm: number
  completedLoadsCount: number
  monthlyFixedCosts: number
  loadBreakdown: LoadRevenue[]
  expensePreferences: ExpensePreferences
}

export interface EligibilityFlags {
  eligibleTruckType: boolean
  eligibleTrailerLength: boolean
  eligibleCertifications: boolean
  eligibleSchedule: boolean
  eligibleMinRate: boolean
  eligibleMinValue: boolean
  eligibleDeadhead: boolean
  isEligible: boolean
}

export interface ScoredLoad {
  loadId: string
  eligibilityFlags: EligibilityFlags
  recommendationScore: number
}

export interface UpdateDriverProfilePayload {
  name?: string
  professionalTitle?: string
  profilePictureUrl?: string
  phone?: string
  homeLocation?: Partial<HomeLocation>
  pricingPreferences?: Partial<PricingPreferences>
  notificationPreferences?: Partial<NotificationPreferences>
  availableForLoads?: boolean
  certificationDocuments?: CertificationDocument[]
}
