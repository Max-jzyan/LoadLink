import { Schema, model, InferSchemaType, Types } from 'mongoose'
import { AUCTION_STATUSES, AUCTION_STATUS_VALUES, CURRENCIES, CURRENCY_VALUES } from '../enums'

const AuctionSchema = new Schema(
  {
    loadId: {
      type: Types.ObjectId,
      ref: 'Load',
      required: true,
      unique: true, // 1 auction per load
      index: true,
    },

    companyId: {
      type: Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    startPrice: { type: Number, required: true },
    capPrice: { type: Number, required: true },

    autoAcceptPercent: { type: Number, default: 0 }, // 0–100

    autoAcceptTriggerHours: { type: Number, default: 0 },

    priceCreepAmount: { type: Number, required: true }, // e.g., +$10
    priceCreepIntervalHours: { type: Number, required: true }, // e.g., every 1 hour

    currentPrice: { type: Number, required: true },
    currency: { type: String, enum: CURRENCY_VALUES, default: CURRENCIES.CAD },
    expiresAt: { type: Date, required: true },

    status: {
      type: String,
      enum: AUCTION_STATUS_VALUES,
      default: AUCTION_STATUSES.Active,
    },

    claimedByDriverId: {
      type: Types.ObjectId,
      ref: 'User',
      default: null,
    },

    autoAcceptedBidId: {
      type: Types.ObjectId,
      ref: 'Bid',
      default: null,
    },

    lastPriceUpdateAt: { type: Date, default: Date.now }, // for heartbeat engine

    // Lowest submitted bid amount seen so far
    // Null = no bids yet
    bestBidAmount: { type: Number, default: null },
  },
  { timestamps: true }
)

export type Auction = InferSchemaType<typeof AuctionSchema>

export interface IAuction {
  loadId: Types.ObjectId
  companyId: Types.ObjectId
  startPrice: number
  capPrice: number
  currentPrice: number
  priceCreepAmount: number
  priceCreepIntervalHours: number
  autoAcceptPercent?: number
  autoAcceptTriggerHours?: number
  currency?: string
  expiresAt: Date
  status?: string
  claimedByDriverId?: Types.ObjectId | null
  autoAcceptedBidId?: Types.ObjectId | null
  lastPriceUpdateAt?: Date
  bestBidAmount?: number | null
}

export const AuctionModel = model<IAuction>('Auction', AuctionSchema)
