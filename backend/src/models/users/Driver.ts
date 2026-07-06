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

const ExpensePreferencesSchema = new Schema(
  {
    fuelCostPerLiter: { type: Number, default: 1.5, min: 0 },
    fuelEfficiencyKmPerLiter: { type: Number, default: 3.5, min: 0 },
    insurancePerMonth: { type: Number, default: 500, min: 0 },
    maintenancePerKm: { type: Number, default: 0.15, min: 0 },
    otherFixedCostsPerMonth: { type: Number, default: 0, min: 0 },
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

const HomeLocationSchema = new Schema(
  {
    city: { type: String, default: '' },
    province: { type: String, default: '' },
    country: { type: String, default: 'Canada' },
  },
  { _id: false }
)

const DriverSchema = new Schema({
  professionalTitle: { type: String, default: '', trim: true },
  profilePictureUrl: { type: String, default: '' },

  trucks: [{ type: Types.ObjectId, ref: 'Truck', index: true }],
  certifications: [{ type: String, enum: CERTIFICATION_VALUES, trim: true }],

  availableForLoads: { type: Boolean, default: true },
  pricingPreferences: { type: PricingPreferencesSchema, default: () => ({}) },
  expensePreferences: { type: ExpensePreferencesSchema, default: () => ({}) },
  notificationPreferences: { type: NotificationPreferencesSchema, default: () => ({}) },
  homeLocation: { type: HomeLocationSchema, default: () => ({}) },

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
