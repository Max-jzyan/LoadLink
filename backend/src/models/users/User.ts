import { Schema, model, InferSchemaType, Types } from 'mongoose'
import { USER_ROLES } from '../enums'

const UserSchema = new Schema(
  {
    firebaseUid: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    role: {
      type: String,
      enum: USER_ROLES,
      required: true,
    },

    // Shared basic identity info
    name: { type: String, required: true },
    email: { type: String, required: true, index: true },
    phone: { type: String, default: '' },

    // Role-specific profile references
    driverProfileId: {
      type: Types.ObjectId,
      ref: 'DriverProfile',
      default: null,
    },

    companyProfileId: {
      type: Types.ObjectId,
      ref: 'CompanyProfile',
      default: null,
    },
  },
  { timestamps: true }
)

export type User = InferSchemaType<typeof UserSchema>
export const UserModel = model('User', UserSchema)
