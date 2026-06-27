import { InferSchemaType, Schema, Types } from 'mongoose'
import { USER_ROLES } from '../enums'
import { RatingSummarySchema } from '../ratings/Rating'
import { UserModel } from './User'

const CompanySchema = new Schema({
  companyName: { type: String, required: true, trim: true, index: true },
  contactName: { type: String, required: true, trim: true },

  businessAddress: { type: String, default: '' },
  businessNumber: { type: String, default: '' }, // optional registration number

  ratingSummary: { type: RatingSummarySchema, default: () => ({}) },

  blockedUsers: [{ type: Types.ObjectId, ref: 'Blocklist' }],

  postedLoadsCount: { type: Number, default: 0, min: 0 },
  lastActiveAt: { type: Date, default: null },
})

export type Company = InferSchemaType<typeof CompanySchema>
export const CompanyModel = UserModel.discriminator('Company', CompanySchema, USER_ROLES.COMPANY)
