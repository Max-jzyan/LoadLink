import { InferSchemaType, Schema, Types, model } from 'mongoose'
import { CompanyProfileModel } from '../users/Company'
import { DriverProfileModel } from '../users/Driver'
import { UserModel } from '../users/User'

export const TARGET_TYPES = {
  DRIVER_PROFILE: 'DriverProfile',
  COMPANY_PROFILE: 'CompanyProfile',
} as const
export type TargetType = (typeof TARGET_TYPES)[keyof typeof TARGET_TYPES]

const BlocklistSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    targetId: { type: Types.ObjectId, required: true, index: true },
    targetType: {
      type: String,
      enum: [TARGET_TYPES.DRIVER_PROFILE, TARGET_TYPES.COMPANY_PROFILE],
      required: true,
      index: true,
    },
    reason: { type: String, default: '', trim: true },
    notes: { type: String, default: '', trim: true },
    blockedAt: { type: Date, default: () => new Date(), index: true },
    expiresAt: { type: Date, default: null, index: true },
    createdByAdminId: { type: Types.ObjectId, ref: 'User', default: null },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
)

/**
 * Pre-validate hook using async style.
 * Throw an Error to abort validation on failure.
 */
interface BlocklistDoc {
  userId: Types.ObjectId
  targetId: Types.ObjectId
  targetType: 'DriverProfile' | 'CompanyProfile'
}

BlocklistSchema.pre('validate', async function (this: BlocklistDoc) {
  // `this` is the document being validated
  const doc = this as BlocklistDoc

  // Load actor user role
  const actor = await UserModel.findById(doc.userId).select('role').lean()
  if (!actor) throw new Error('Actor user not found')

  // Validate target existence and allowed direction
  if (doc.targetType === TARGET_TYPES.DRIVER_PROFILE) {
    const target = await DriverProfileModel.findById(doc.targetId).select('_id').lean()
    if (!target) throw new Error('Target driver profile not found')
    if (actor.role !== 'company') throw new Error('Only company may block drivers')
  } else if (doc.targetType === TARGET_TYPES.COMPANY_PROFILE) {
    const target = await CompanyProfileModel.findById(doc.targetId).select('_id').lean()
    if (!target) throw new Error('Target company profile not found')
    if (actor.role !== 'driver') throw new Error('Only drivers may block company')
  } else {
    throw new Error('Invalid targetType')
  }
})

/**
 * Auto-deactivate expired entries before save
 */
BlocklistSchema.pre('save', function (this: any, next) {
  if (this.expiresAt && new Date() > new Date(this.expiresAt)) {
    this.isActive = false
  }
  next()
})

export type Blocklist = InferSchemaType<typeof BlocklistSchema>
export const BlocklistModel = model('Blocklist', BlocklistSchema)
