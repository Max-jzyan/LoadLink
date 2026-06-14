// models/trucks/Truck.ts
import { Schema, model, InferSchemaType, Types } from 'mongoose'
import { TRUCK_TYPES } from '../enums'

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

const TruckSchema = new Schema(
  {
    ownerDriverId: {
      type: Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    make: { type: String, required: true, trim: true },
    model: { type: String, required: true, trim: true },
    year: { type: Number, required: true, min: 1900, max: 2100 },
    truckType: {
      type: String,
      enum: TRUCK_TYPES,
      required: true,
      index: true,
    },

    trailerLengthFt: { type: Number, required: true, min: 1 },

    capacityLbs: { type: Number, required: true, min: 0 },
    maxPayloadLbs: { type: Number, default: 0, min: 0 },

    plateNumber: { type: String, required: true, trim: true, index: true },
    vin: { type: String, default: '', trim: true, index: true },

    certifications: [{ type: String, trim: true }], // e.g., "Reefer HACCP", "HazMat Class A"

    isPrimary: { type: Boolean, default: false }, // primary truck for owner

    maintenanceRecords: { type: [MaintenanceRecordSchema], default: [] },

    // Optional notes
    notes: { type: String, default: '' },
  },
  { timestamps: true }
)

// Unique constraint: Ensure a driver cannot have two trucks with the same plateNumber
TruckSchema.index({ ownerDriverId: 1, plateNumber: 1 }, { unique: true })

TruckSchema.virtual('displayName').get(function (this: any) {
  return `${this.year} ${this.make} ${this.model} (${this.trailerLengthFt}ft)`
})

export type Truck = InferSchemaType<typeof TruckSchema>
export const TruckModel = model('Truck', TruckSchema)
