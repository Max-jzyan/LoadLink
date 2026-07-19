import { Schema, model, InferSchemaType, Types } from 'mongoose'
import { LOAD_STATUSES, TRUCK_TYPES, CERTIFICATION_VALUES } from '../enums'

const CoordinateSchema = new Schema(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  { _id: false }
)

const RouteSegmentSchema = new Schema(
  {
    polyline: { type: String, required: true }, // encoded polyline
    distanceKm: { type: Number, required: true },
    durationHours: { type: Number, required: true },
  },
  { _id: false }
)

const ExpenseOverridesSchema = new Schema(
  {
    fuelCostPerLiter: { type: Number, default: null, min: 0 },
    fuelEfficiencyKmPerLiter: { type: Number, default: null, min: 0 },
    maintenancePerKm: { type: Number, default: null, min: 0 },
  },
  { _id: false }
)

const CheckInSchema = new Schema(
  {
    coords: { type: CoordinateSchema, required: true },
    checkedInAt: { type: Date, required: true },
  },
  { _id: false }
)

const LoadSchema = new Schema(
  {
    companyId: {
      type: Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    assignedDriverId: {
      type: Types.ObjectId,
      ref: 'User',
      default: null,
    },

    selectedTruckId: {
      type: Types.ObjectId,
      ref: 'Truck',
      default: null,
    },

    originAddress: { type: String, required: true },
    destinationAddress: { type: String, required: true },

    originCoords: { type: CoordinateSchema, required: true },
    destinationCoords: { type: CoordinateSchema, required: true },

    pickupTime: { type: Date, required: true },
    dropoffTime: { type: Date, required: true },

    weightLbs: { type: Number, required: true },
    commodity: { type: String, required: true },

    truckType: {
      type: String,
      enum: TRUCK_TYPES,
      required: true,
    },

    trailerLengthFt: { type: Number, required: true },
    certifications: [{ type: String, enum: CERTIFICATION_VALUES }],
    driverAssist: { type: Boolean, default: false },

    expenseOverrides: { type: ExpenseOverridesSchema, default: () => ({}) },

    route: {
      type: RouteSegmentSchema,
      required: false, // generated after geocoding
    },

    auctionId: {
      type: Types.ObjectId,
      ref: 'Auction',
      default: null,
    },

    status: {
      type: String,
      enum: LOAD_STATUSES,
      default: 'draft',
    },

    createdBy: {
      type: Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Most recent driver check-in ping (approximate location), if any.
    // Single most-recent value only — no history is kept.
    lastCheckIn: {
      type: CheckInSchema,
      default: null,
    },
  },
  { timestamps: true }
)

export type Load = InferSchemaType<typeof LoadSchema>
export const LoadModel = model('Load', LoadSchema)
