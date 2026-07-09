import type { Bid } from '../driverApi/driverEnum'

// Mirror of backend/src/models/enums.ts — keep values in sync.
export const AUCTION_STATUSES = {
  Active: 'live',
  Closed: 'closed',
  Cancelled: 'cancelled',
} as const
export type AuctionStatus = (typeof AUCTION_STATUSES)[keyof typeof AUCTION_STATUSES]

export const BID_STATUSES = {
  Draft: 'draft',
  Pending: 'pending',
  Submitted: 'submitted',
  Withdrawn: 'withdrawn',
  Rejected: 'rejected',
  Accepted: 'accepted',
  Expired: 'expired',
} as const
export type BidStatus = (typeof BID_STATUSES)[keyof typeof BID_STATUSES]

export const CURRENCIES = { CAD: 'CAD' } as const
export type Currency = (typeof CURRENCIES)[keyof typeof CURRENCIES]

export interface RatingSummary {
  average: number
  totalReviews: number
  categories?: {
    timeliness: number
    communication: number
    reliability: number
    professionalism: number
    documentationAccuracy: number
  }
  lastUpdatedAt?: string | null
}

export interface Driver {
  _id: string
  name: string
  firebaseUid: string
  email?: string
  phone?: string
  ratingSummary?: RatingSummary
}

export interface PopulatedBid extends Omit<Bid, 'driverId'> {
  driverId: Driver
}

export interface Auction {
  _id: string
  loadId: string
  companyId: string
  startPrice: number
  capPrice: number
  autoAcceptPercent: number
  autoAcceptTriggerHours: number
  priceCreepAmount: number
  priceCreepIntervalHours: number
  currentPrice: number
  currency: string
  expiresAt: string
  status: string
  claimedByDriverId?: string | null
  autoAcceptedBidId?: string | null
  lastPriceUpdateAt: string
  createdAt: string
  updatedAt: string
}

export interface BidsStreamPayload {
  loadId: string
  bids: PopulatedBid[]
  loadEventType: string
}

export interface PriceStreamPayload {
  loadId: string
  currentPrice: number
  currency: string
  loadEventType: string
  updatedAt: string
}

export interface AcceptBidResult {
  loadId: string
  driverId: string
  finalPayout: number
  rateConfirmationUrl: string
}

export interface EditAuctionPayload {
  extendByMinutes?: number
  newPriceCeiling?: number
  autoAcceptTolerancePercentage?: number
}

export interface EditAuctionResult {
  loadId: string
  newExpiresAt: string
  priceCeiling: number
  autoAcceptToleranceThreshold: number
}

export interface ReopenAuctionPayload {
  extendByHours?: number // Default is 4 hours on the server
}

export interface ReopenAuctionResult {
  loadId: string
  newExpiresAt: string
}
