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

const ScoreWeightSchema = new Schema(
  {
    rate: { type: Number, default: 0.25, min: 0, max: 1 },
    value: { type: Number, default: 0.1, min: 0, max: 1 },
    deadhead: { type: Number, default: 0.2, min: 0, max: 1 },
    geographicProximity: { type: Number, default: 0.2, min: 0, max: 1 },
    temporalAdjacency: { type: Number, default: 0.15, min: 0, max: 1 },
    truckTypeMatch: { type: Number, default: 0.05, min: 0, max: 1 },
    competition: { type: Number, default: 0.05, min: 0, max: 1 },
  },
  { _id: false }
)

const ExpensePreferencesSchema = new Schema(
  {
    fuelCostPerLiter: { type: Number, default: 1.5, min: 0 },
    fuelEfficiencyKmPerLiter: { type: Number, default: 3.5, min: 0 },
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

export const DOC_VERIFICATION_STATUSES = ['pending', 'approved', 'rejected'] as const
export type DocVerificationStatus = (typeof DOC_VERIFICATION_STATUSES)[number]

const CertificationDocumentSchema = new Schema(
  {
    name: { type: String, required: true },
    url: { type: String, required: true },
    key: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
    verificationStatus: {
      type: String,
      enum: DOC_VERIFICATION_STATUSES,
      default: 'pending',
    },
    reviewNotes: { type: String, default: '' },
  },
  { _id: false }
)

/**
 * Insurance certificate uploaded by the driver (e.g. commercial auto policy).
 * Future: can be cross-referenced with FMCSA API using the carrier MC/DOT number.
 */
const InsuranceCertificateSchema = new Schema(
  {
    insurer: { type: String, required: true },
    policyNumber: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    url: { type: String, required: true },
    key: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
    verificationStatus: {
      type: String,
      enum: DOC_VERIFICATION_STATUSES,
      default: 'pending',
    },
    reviewNotes: { type: String, default: '' },
  },
  { _id: false }
)

const DriverSchema = new Schema({
  professionalTitle: { type: String, default: '', trim: true },

  // profilePictureUrl and notificationPreferences are now inherited from the User base schema

  trucks: [{ type: Types.ObjectId, ref: 'Truck', index: true }],
  certifications: [{ type: String, enum: CERTIFICATION_VALUES, trim: true }],
  certificationDocuments: [CertificationDocumentSchema],

  // ── Regulatory / carrier identity ────────────────────────────────────────
  /**
   * Motor Carrier (MC) number issued by FMCSA. Used for rate confirmations and
   * future FMCSA SaferBus API lookups.
   */
  mcNumber: { type: String, default: '', trim: true },

  /**
   * USDOT number assigned by FMCSA. Paired with MC number for carrier lookup.
   * Future: automate validation via https://mobile.fmcsa.dot.gov/QCDevsite/docs
   */
  dotNumber: { type: String, default: '', trim: true },

  /** Insurance certificates uploaded by the driver for admin review. */
  insuranceCertificates: { type: [InsuranceCertificateSchema], default: () => [] },

  availableForLoads: { type: Boolean, default: true },
  pricingPreferences: { type: PricingPreferencesSchema, default: () => ({}) },
  scoreWeights: { type: ScoreWeightSchema, default: () => ({}) },
  expensePreferences: { type: ExpensePreferencesSchema, default: () => ({}) },
  notificationPreferences: { type: NotificationPreferencesSchema, default: () => ({}) },
  homeLocation: { type: HomeLocationSchema, default: () => ({}) },

  ratingSummary: { type: RatingSummarySchema, default: () => ({}) },

  blockedUsers: [{ type: Types.ObjectId, ref: 'Blocklist' }],

  completedLoadsCount: { type: Number, default: 0, min: 0 },
  // lastActiveAt is now inherited from the User base schema
})

DriverSchema.virtual('trucksCount').get(function (this: any) {
  return Array.isArray(this.trucks) ? this.trucks.length : 0
})

export type Driver = InferSchemaType<typeof DriverSchema>
export const DriverModel = UserModel.discriminator('Driver', DriverSchema, USER_ROLES.DRIVER)
