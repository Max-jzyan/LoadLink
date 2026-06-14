import { InferSchemaType, Schema, Types, model } from 'mongoose'
import { USER_ROLES } from '../enums'

export const TARGET_TYPES = {
  DRIVER: USER_ROLES.DRIVER,
  COMPANY: USER_ROLES.COMPANY,
} as const
export type TargetType = (typeof TARGET_TYPES)[keyof typeof TARGET_TYPES]

const BlocklistSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    targetId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    targetType: {
      type: String,
      enum: [TARGET_TYPES.DRIVER, TARGET_TYPES.COMPANY],
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

// unique constraint: each pair of userId and targetId should be unique.
BlocklistSchema.index({ userId: 1, targetId: 1 }, { unique: true })

export type Blocklist = InferSchemaType<typeof BlocklistSchema>
export const BlocklistModel = model('Blocklist', BlocklistSchema)
