import { InferSchemaType, Schema, Types, model } from 'mongoose'
import { BID_STATUSES } from '../enums'

const BidSchema = new Schema(
  {
    loadId: {
      type: Types.ObjectId,
      ref: 'Load',
      required: true,
      index: true,
    },

    auctionId: {
      type: Types.ObjectId,
      ref: 'Auction',
      required: true,
      index: true,
    },

    driverId: {
      type: Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 1,
    },

    status: {
      type: String,
      enum: BID_STATUSES,
      default: 'pending',
    },

    // When the bid was accepted (if applicable)
    acceptedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
)

export type Bid = InferSchemaType<typeof BidSchema>
export const BidModel = model('Bid', BidSchema)
