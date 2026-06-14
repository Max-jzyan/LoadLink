import { Schema, model, InferSchemaType } from 'mongoose'

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
  },
  {
    timestamps: true,
    discriminatorKey: 'role',
  }
)

export type User = InferSchemaType<typeof UserSchema>
export const UserModel = model('User', UserSchema)
