import { Schema, model, InferSchemaType, Types } from 'mongoose'

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

    priceCreepAmount: { type: Number, required: true }, // e.g., +$10
    priceCreepIntervalHours: { type: Number, required: true }, // e.g., every 1 hour

    currentPrice: { type: Number, required: true },
    expiresAt: { type: Date, required: true },

    status: {
      type: String,
      enum: ['live', 'closed', 'cancelled'],
      default: 'live',
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
  },
  { timestamps: true }
)

export type Auction = InferSchemaType<typeof AuctionSchema>
export const AuctionModel = model('Auction', AuctionSchema)
