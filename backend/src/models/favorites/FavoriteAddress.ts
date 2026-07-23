import { InferSchemaType, Schema, Types, model } from 'mongoose'

const FavoriteAddressSchema = new Schema(
  {
    companyId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    address: { type: String, required: true, trim: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },
  { timestamps: true }
)

// A company can only save the same address once.
FavoriteAddressSchema.index({ companyId: 1, address: 1 }, { unique: true })

export type FavoriteAddress = InferSchemaType<typeof FavoriteAddressSchema>
export const FavoriteAddressModel = model('FavoriteAddress', FavoriteAddressSchema)
