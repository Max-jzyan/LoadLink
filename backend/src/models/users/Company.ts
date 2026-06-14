import { Schema, model, InferSchemaType, Types } from 'mongoose'
import { RatingSummarySchema } from '../ratings/ratings'

/**
 * CompanyProfile schema
 *
 * Stores shipper-specific profile data and business contact information.
 */
const CompanyProfileSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: 'User', required: true, index: true },

    companyName: { type: String, required: true, trim: true, index: true },
    contactName: { type: String, required: true, trim: true },

    email: { type: String, required: true, trim: true, lowercase: true, index: true },
    phone: { type: String, default: '' },

    // Business metadata
    businessAddress: { type: String, default: '' },
    businessNumber: { type: String, default: '' }, // optional registration number

    ratingSummary: { type: RatingSummarySchema, default: () => ({}) },

    // References
    documents: [{ type: Types.ObjectId, ref: 'Document' }],
    blockedUsers: [{ type: Types.ObjectId, ref: 'Blocklist' }],

    // Quick stats
    postedLoadsCount: { type: Number, default: 0, min: 0 },
    lastActiveAt: { type: Date, default: null },
  },
  { timestamps: true }
)

/**
 * Indexes and virtuals
 */
CompanyProfileSchema.index({ userId: 1 }, { unique: true })
CompanyProfileSchema.index({ companyName: 1 })

CompanyProfileSchema.virtual('isVerified').get(function (this: any) {
  // Example: a company is considered verified if it has at least one verified document
  // Actual verification logic should be implemented in service layer
  return Array.isArray(this.documents) && this.documents.length > 0
})

/**
 * Export types and model
 */
export type CompanyProfile = InferSchemaType<typeof CompanyProfileSchema>
export const CompanyProfileModel = model('CompanyProfile', CompanyProfileSchema)
