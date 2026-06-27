import { InferSchemaType, Schema, Types, model } from 'mongoose'
import { RatingCategoriesSchema } from './Rating'

// Reviews are bidirectional:
//   - A DRIVER reviews a COMPANY (after hauling their load)
//   - A COMPANY reviews a DRIVER  (after the driver completes the haul)
// targetType indicates which role is being reviewed.
export const TARGET_TYPES = {
  DRIVER: 'driver',
  COMPANY: 'company',
} as const
export type TargetType = (typeof TARGET_TYPES)[keyof typeof TARGET_TYPES]

const ReviewSchema = new Schema(
  {
    reviewerId: {
      type: Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    targetId: {
      type: Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // The role of the person BEING reviewed (so "driver" means a company reviewed a driver)
    targetType: {
      type: String,
      enum: [TARGET_TYPES.DRIVER, TARGET_TYPES.COMPANY],
      required: true,
      index: true,
    },

    loadId: {
      type: Types.ObjectId,
      ref: 'Load',
      required: true,
      index: true,
    },

    // Embedded sub-document using the existing RatingCategoriesSchema
    ratingCategories: {
      type: RatingCategoriesSchema,
      required: true,
    },

    comment: { type: String, default: '', trim: true, maxlength: 2000 },
  },
  { timestamps: true }
)

// A user can only leave one review per load (prevents spam/double reviews)
ReviewSchema.index({ reviewerId: 1, loadId: 1 }, { unique: true })
// Efficiently look up all reviews for a target user, newest first
ReviewSchema.index({ targetId: 1, createdAt: -1 })

export type Review = InferSchemaType<typeof ReviewSchema>
export const ReviewModel = model('Review', ReviewSchema)
