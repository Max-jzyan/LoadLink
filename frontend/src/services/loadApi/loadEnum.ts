import type { Auction } from '../auctionApi/auctionEnum'
import type { LoadStatus } from '@/types/enums'

export type { LoadStatus }

export interface Coordinate {
  lat: number
  lng: number
}

// Populated company subdocument returned when companyId is joined
export interface CompanySummary {
  _id: string
  name: string
  email: string
  companyName: string
}

// Populated driver subdocument returned when assignedDriverId is joined
export interface DriverSummary {
  _id: string
  name: string
  firebaseUid?: string
}

// Populated auction subdocument returned when auctionId is joined
export interface AuctionSummary {
  _id: string
  startPrice: number
  capPrice: number
  currentPrice: number
  currency: string
  status: string
  expiresAt: string
  autoAcceptPercent: number
  priceCreepAmount: number
  priceCreepIntervalHours: number
  bestBidAmount: number | null
}

export interface RouteSegment {
  polyline: string
  distanceKm: number
  durationHours: number
}

export interface Load {
  _id: string
  companyId: string | CompanySummary
  assignedDriverId?: string | DriverSummary | null
  selectedTruckId?: string | null
  originAddress: string
  destinationAddress: string
  originCoords: Coordinate
  destinationCoords: Coordinate
  pickupTime: string
  dropoffTime: string
  weightLbs: number
  commodity: string
  truckType: string
  trailerLengthFt: number
  certifications?: string[]
  driverAssist?: boolean
  route?: RouteSegment
  auctionId?: string | AuctionSummary | null
  status: LoadStatus
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface PopulatedCompany {
  _id: string
  name: string
}

export interface PopulatedLoad extends Omit<Load, 'companyId' | 'auctionId'> {
  companyId: PopulatedCompany
  auctionId?: Auction | null
}

export interface CreateLoadPayload {
  originAddress: string
  destinationAddress: string
  originCoords: Coordinate
  destinationCoords: Coordinate
  pickupTime: string
  dropoffTime: string
  weightLbs: number
  commodity: string
  truckType: string
  trailerLengthFt: number
  certifications?: string[]
  driverAssist?: boolean
  // Auction fields that need to be posted alongside the load so it goes live immediately
  startPrice: number
  capPrice: number
  priceCreepAmount: number
  priceCreepIntervalHours?: number
  autoAcceptPercent?: number
  autoAcceptTriggerHours?: number
  expiresAt: string
}

export interface CreateAuctionPayload {
  startPrice: number
  capPrice: number
  priceCreepAmount: number
  autoAcceptPercent?: number
  autoAcceptTriggerHours?: number
  hoursBeforeDropoff?: number
}

export interface CreatedAuction {
  _id: string
}

export interface UpdateLoadPayload extends Partial<CreateLoadPayload> {
  status?: string
  auctionId?: string
  assignedDriverId?: string
}
