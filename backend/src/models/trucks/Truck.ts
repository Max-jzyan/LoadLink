// models/trucks/Truck.ts
import { Schema, model, InferSchemaType, Types } from 'mongoose'
import { TRUCK_TYPES } from '../enums'

/**
 * MaintenanceRecord sub-schema
 * - kept as an embedded array because maintenance entries are tightly coupled to a truck
 */
const MaintenanceRecordSchema = new Schema(
  {
    date: { type: Date, required: true },
    type: { type: String, required: true, trim: true }, // e.g., "oil change", "brakes"
    notes: { type: String, default: '' },
    costCents: { type: Number, default: 0, min: 0 }, // store money as integer cents
    serviceProvider: { type: String, default: '' },
  },
  { _id: false }
)

/**
 * Truck schema
 *
 * Fields chosen to match the UI and business needs:
 * - ownerDriverProfileId: reference to DriverProfile
 * - truckType: enum to match load/truck requirements
 * - capacity fields and trailer length
 * - plate and VIN for identification
 * - certifications array for compliance checks
 */
const TruckSchema = new Schema(
  {
    ownerDriverProfileId: {
      type: Types.ObjectId,
      ref: 'DriverProfile',
      required: true,
      index: true,
    },

    // Basic identification
    make: { type: String, required: true, trim: true },
    model: { type: String, required: true, trim: true },
    year: { type: Number, required: true, min: 1900, max: 2100 },

    // Truck/trailer classification
    truckType: {
      type: String,
      enum: TRUCK_TYPES,
      required: true,
      index: true,
    },

    trailerLengthFt: { type: Number, required: true, min: 1 },

    // Capacity and limits
    capacityLbs: { type: Number, required: true, min: 0 },
    maxPayloadLbs: { type: Number, default: 0, min: 0 },

    // Identifiers
    plateNumber: { type: String, required: true, trim: true, index: true },
    vin: { type: String, default: '', trim: true, index: true },

    // Compliance and certifications
    certifications: [{ type: String, trim: true }], // e.g., "Reefer HACCP", "HazMat Class A"

    // Flags
    isPrimary: { type: Boolean, default: false }, // primary truck for owner

    // Embedded maintenance history
    maintenanceRecords: { type: [MaintenanceRecordSchema], default: [] },

    // Optional notes
    notes: { type: String, default: '' },
  },
  { timestamps: true }
)

/**
 * Indexes and constraints
 * - Ensure a driver cannot have two trucks with the same plateNumber
 */
TruckSchema.index({ ownerDriverProfileId: 1, plateNumber: 1 }, { unique: true })

/**
 * Virtuals
 */
TruckSchema.virtual('displayName').get(function (this: any) {
  return `${this.year} ${this.make} ${this.model} (${this.trailerLengthFt}ft)`
})

/**
 * Export types and model
 */
export type Truck = InferSchemaType<typeof TruckSchema>
export const TruckModel = model('Truck', TruckSchema)
