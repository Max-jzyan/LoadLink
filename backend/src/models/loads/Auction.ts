import { Schema, model, InferSchemaType, Types } from 'mongoose'

const AuctionSchema = new Schema(
  {
    // -----------------------------
    // RELATIONSHIPS
    // -----------------------------
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

    // -----------------------------
    // PRICING CONFIG
    // -----------------------------
    startPrice: { type: Number, required: true },
    capPrice: { type: Number, required: true },

    // Auto-accept tolerance (e.g., 10% above cap)
    autoAcceptPercent: { type: Number, default: 0 }, // 0–100

    // Price creep algorithm
    priceCreepAmount: { type: Number, required: true }, // e.g., +$10
    priceCreepIntervalHours: { type: Number, required: true }, // e.g., every 1 hour

    // -----------------------------
    // LIVE STATE
    // -----------------------------
    currentPrice: { type: Number, required: true },
    expiresAt: { type: Date, required: true },

    // Auction lifecycle
    status: {
      type: String,
      enum: ['live', 'closed', 'cancelled'],
      default: 'live',
    },

    // When a driver claims the load at current price
    claimedByDriverId: {
      type: Types.ObjectId,
      ref: 'User',
      default: null,
    },

    // -----------------------------
    // AUTO-ACCEPT LOGIC
    // -----------------------------
    autoAcceptedBidId: {
      type: Types.ObjectId,
      ref: 'Bid',
      default: null,
    },

    // -----------------------------
    // METADATA
    // -----------------------------
    lastPriceUpdateAt: { type: Date, default: Date.now }, // for heartbeat engine
  },
  { timestamps: true }
)

export type Auction = InferSchemaType<typeof AuctionSchema>
export const AuctionModel = model('Auction', AuctionSchema)
