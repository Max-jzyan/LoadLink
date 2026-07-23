import { StatusCodes } from 'http-status-codes'
import { isValidObjectId, Types } from 'mongoose'
import { FavoriteAddressModel } from '../models/favorites/FavoriteAddress'
import { ApiError } from '../utils/ApiError'

const assertValidId = (id: string, label: string) => {
  if (!isValidObjectId(id)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, `Invalid ${label}`)
  }
}

/** Fetch a company's saved addresses, newest first. */
export const getFavoriteAddresses = async (companyId: string) => {
  assertValidId(companyId, 'companyId')

  return FavoriteAddressModel.find({ companyId: new Types.ObjectId(companyId) }).sort({
    createdAt: -1,
  })
}

/** Save a new favorite address for a company. */
export const addFavoriteAddress = async (data: {
  companyId: string
  address: string
  lat: number
  lng: number
}) => {
  assertValidId(data.companyId, 'companyId')

  const address = data.address?.trim()
  if (!address) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'address is required')
  }
  if (typeof data.lat !== 'number' || typeof data.lng !== 'number') {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'lat and lng are required')
  }

  const existing = await FavoriteAddressModel.findOne({
    companyId: new Types.ObjectId(data.companyId),
    address,
  })
  if (existing) {
    throw new ApiError(StatusCodes.CONFLICT, 'This address is already saved')
  }

  return FavoriteAddressModel.create({
    companyId: new Types.ObjectId(data.companyId),
    address,
    lat: data.lat,
    lng: data.lng,
  })
}

/** Remove a saved address (must belong to the requesting company). */
export const deleteFavoriteAddress = async (companyId: string, addressId: string) => {
  assertValidId(companyId, 'companyId')
  assertValidId(addressId, 'addressId')

  const result = await FavoriteAddressModel.deleteOne({
    _id: new Types.ObjectId(addressId),
    companyId: new Types.ObjectId(companyId),
  })

  if (result.deletedCount === 0) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Favorite address not found')
  }
}
