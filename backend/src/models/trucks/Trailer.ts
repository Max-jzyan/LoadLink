// models/trucks/Trailer.ts
import { Schema, model, InferSchemaType, Types } from 'mongoose'
import { TRUCK_TYPES, CERTIFICATION_VALUES } from '../enums'

const TrailerSchema = new Schema(
  {
    ownerDriverId: {
      type: Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    /** Fleet / unit number, e.g. "Trailer 12", "TR-045" */
    unitNumber: { type: String, default: '', trim: true },

    plateNumber: { type: String, required: true, trim: true, index: true },

    vin: { type: String, default: '', trim: true },

    /** Trailer type — reuses truck-type enum for equipment compatibility */
    trailerType: {
      type: String,
      enum: TRUCK_TYPES,
      required: true,
    },

    lengthFt: { type: Number, required: true, min: 1 },

    capacityLbs: { type: Number, default: 0, min: 0 },

    year: { type: Number, default: null, min: 1900, max: 2100 },

    make: { type: String, default: '', trim: true },

    certifications: [{ type: String, enum: CERTIFICATION_VALUES, trim: true }],

    notes: { type: String, default: '' },

    isPrimary: { type: Boolean, default: false },
  },
  { timestamps: true }
)

// Unique: a driver can't register the same plate twice
TrailerSchema.index({ ownerDriverId: 1, plateNumber: 1 }, { unique: true })

export type Trailer = InferSchemaType<typeof TrailerSchema>
export const TrailerModel = model('Trailer', TrailerSchema)
