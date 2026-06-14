// models/users/DriverProfile.ts
import { InferSchemaType, Schema, Types, model } from 'mongoose'
import { RatingSummarySchema } from '../ratings/ratings'

const PricingPreferencesSchema = new Schema(
  {
    minimumRatePerMile: { type: Number, default: 0, min: 0 },
    minimumLoadValue: { type: Number, default: 0, min: 0 },
    preferredMaxDeadheadMiles: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
)

const NotificationPreferencesSchema = new Schema(
  {
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
    workNotifications: { type: Boolean, default: true },
  },
  { _id: false }
)

/**
 * DriverProfile schema
 *
 * Stores driver-specific profile data. Keep this focused on business data
 * so the top-level User document can remain lightweight.
 */
const DriverProfileSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: 'User', required: true, index: true },

    // Convenience copy of basic identity fields for quick reads
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, index: true },
    phone: { type: String, default: '' },

    // Fleet and certifications
    trucks: [{ type: Types.ObjectId, ref: 'Truck', index: true }],
    certifications: [{ type: String, trim: true }],

    // Availability and preferences
    availableForLoads: { type: Boolean, default: true },
    pricingPreferences: { type: PricingPreferencesSchema, default: () => ({}) },
    notificationPreferences: { type: NotificationPreferencesSchema, default: () => ({}) },

    // Ratings and performance
    ratingSummary: { type: RatingSummarySchema, default: () => ({}) },

    // References to other collections
    documents: [{ type: Types.ObjectId, ref: 'Document' }],
    blockedUsers: [{ type: Types.ObjectId, ref: 'Blocklist' }],

    // Optional quick stats for dashboards
    completedLoadsCount: { type: Number, default: 0, min: 0 },
    lastActiveAt: { type: Date, default: null },
  },
  { timestamps: true }
)

/**
 * Indexes and virtuals
 */
DriverProfileSchema.index({ userId: 1 }, { unique: true })
DriverProfileSchema.virtual('trucksCount').get(function (this: any) {
  return Array.isArray(this.trucks) ? this.trucks.length : 0
})

/**
 * Export types and model
 */
export type DriverProfile = InferSchemaType<typeof DriverProfileSchema>
export const DriverProfileModel = model('DriverProfile', DriverProfileSchema)
