import { Schema, model, InferSchemaType } from 'mongoose'

// How the user's blocklist affects their feed. Shared by drivers and companies;
// each role's UI only surfaces the keys relevant to it.
const FeedPreferencesSchema = new Schema(
  {
    hideBlocked: { type: Boolean, default: true },
    hideBelowMinimum: { type: Boolean, default: false },
    notifyReview: { type: Boolean, default: false },
  },
  { _id: false }
)

const UserSchema = new Schema(
  {
    firebaseUid: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, index: true },
    phone: { type: String, default: '' },
    feedPreferences: { type: FeedPreferencesSchema, default: () => ({}) },
  },
  {
    timestamps: true,
    discriminatorKey: 'role',
  }
)

export type User = InferSchemaType<typeof UserSchema>
export const UserModel = model('User', UserSchema)
