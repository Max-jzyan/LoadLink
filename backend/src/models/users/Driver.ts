// models/users/Driver.ts
import { InferSchemaType, Schema, Types } from 'mongoose'
import { RatingSummarySchema } from '../ratings/Rating'
import { USER_ROLES, CERTIFICATION_VALUES } from '../enums'
import { UserModel } from './User'

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

const DriverSchema = new Schema({
  trucks: [{ type: Types.ObjectId, ref: 'Truck', index: true }],
  certifications: [{ type: String, enum: CERTIFICATION_VALUES, trim: true }],

  availableForLoads: { type: Boolean, default: true },
  pricingPreferences: { type: PricingPreferencesSchema, default: () => ({}) },
  notificationPreferences: { type: NotificationPreferencesSchema, default: () => ({}) },

  ratingSummary: { type: RatingSummarySchema, default: () => ({}) },

  blockedUsers: [{ type: Types.ObjectId, ref: 'Blocklist' }],

  completedLoadsCount: { type: Number, default: 0, min: 0 },
  lastActiveAt: { type: Date, default: null },
})

DriverSchema.virtual('trucksCount').get(function (this: any) {
  return Array.isArray(this.trucks) ? this.trucks.length : 0
})

export type Driver = InferSchemaType<typeof DriverSchema>
export const DriverModel = UserModel.discriminator('Driver', DriverSchema, USER_ROLES.DRIVER)
