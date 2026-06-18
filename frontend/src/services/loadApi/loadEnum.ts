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
  assignedDriverId?: string | null
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
  expiresAt: string
}

export interface UpdateLoadPayload extends Partial<CreateLoadPayload> {
  status?: string
  auctionId?: string
  assignedDriverId?: string
}
