import { Schema, model, InferSchemaType } from 'mongoose'

const NotificationPreferencesSchema = new Schema({
  email: { type: Boolean, default: true },
  sms: { type: Boolean, default: false },
  workNotifications: { type: Boolean, default: true },
})

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

    // Universal fields shared by both Driver and Company discriminators
    profilePictureUrl: { type: String, default: '' },
    notificationPreferences: { type: NotificationPreferencesSchema, default: () => ({}) },
    lastActiveAt: { type: Date, default: null },
    feedPreferences: { type: FeedPreferencesSchema, default: () => ({}) },
  },
  {
    timestamps: true,
    discriminatorKey: 'role',
  }
)

export type User = InferSchemaType<typeof UserSchema>
export type NotificationPreferences = InferSchemaType<typeof NotificationPreferencesSchema>
export { NotificationPreferencesSchema }
export const UserModel = model('User', UserSchema)
