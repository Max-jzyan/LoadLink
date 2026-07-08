import { InferSchemaType, Schema, Types, model } from 'mongoose'
import { USER_ROLES } from '../enums'

export const REPORT_TYPES = {
  FRAUD: 'fraud',
  INACCURATE: 'inaccurate',
} as const
export type ReportType = (typeof REPORT_TYPES)[keyof typeof REPORT_TYPES]

export const REPORT_STATUSES = {
  UnderReview: 'under_review',
  Resolved: 'resolved',
  Dismissed: 'dismissed',
} as const
export type ReportStatus = (typeof REPORT_STATUSES)[keyof typeof REPORT_STATUSES]

export const REPORT_TARGET_TYPES = {
  DRIVER: USER_ROLES.DRIVER,
  COMPANY: USER_ROLES.COMPANY,
} as const
export type ReportTargetType = (typeof REPORT_TARGET_TYPES)[keyof typeof REPORT_TARGET_TYPES]

const ReportSchema = new Schema(
  {
    reporterId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: [REPORT_TYPES.FRAUD, REPORT_TYPES.INACCURATE],
      required: true,
      index: true,
    },
    targetType: {
      type: String,
      enum: [REPORT_TARGET_TYPES.DRIVER, REPORT_TARGET_TYPES.COMPANY],
      required: true,
    },
    // Free-text name as entered by the reporter — the target may not be a registered user
    targetName: { type: String, required: true, trim: true },
    // Resolved User ref when targetName matches a registered user, else null
    targetId: { type: Types.ObjectId, ref: 'User', default: null, index: true },
    category: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: [REPORT_STATUSES.UnderReview, REPORT_STATUSES.Resolved, REPORT_STATUSES.Dismissed],
      default: REPORT_STATUSES.UnderReview,
      index: true,
    },
    // Admin who last changed the status (resolution audit trail)
    resolvedByAdminId: { type: Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
)

export type Report = InferSchemaType<typeof ReportSchema>
export const ReportModel = model('Report', ReportSchema)
