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

    // S3 key for the rate confirmation PDF (set when bid is accepted/load is claimed)
    rateConfirmationKey: {
      type: String,
      default: null,
    },

    // Presigned URL returned to the client (short-lived; re-generated on demand)
    rateConfirmationUrl: {
      type: String,
      default: null,
    },

    // S3 key for the Bill of Lading PDF (set alongside rate confirmation)
    bolKey: {
      type: String,
      default: null,
    },

    // Presigned URL for the BOL (short-lived; re-generated on demand)
    bolUrl: {
      type: String,
      default: null,
    },

    // S3 key for the SIGNED Bill of Lading uploaded by the driver after delivery
    signedBolKey: {
      type: String,
      default: null,
    },

    // Presigned URL for the signed BOL
    signedBolUrl: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
)

export type Bid = InferSchemaType<typeof BidSchema>
export const BidModel = model('Bid', BidSchema)
