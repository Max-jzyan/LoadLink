import { isValidObjectId, Types } from 'mongoose'
import { StatusCodes } from 'http-status-codes'
import { TrailerModel } from '../models/trucks/Trailer'
import { TruckType, TRUCK_TYPE_VALUES, Certification } from '../models/enums'
import { ApiError } from '../utils/ApiError'

const assertValidId = (id: string, label: string) => {
  if (!isValidObjectId(id)) throw new ApiError(StatusCodes.BAD_REQUEST, `Invalid ${label}`)
}

export const listTrailers = async (driverId: string) =>
  TrailerModel.find({ ownerDriverId: new Types.ObjectId(driverId) }).sort({ isPrimary: -1, createdAt: -1 })

export const getTrailer = async (driverId: string, trailerId: string) => {
  assertValidId(trailerId, 'trailerId')
  const trailer = await TrailerModel.findOne({
    _id: new Types.ObjectId(trailerId),
    ownerDriverId: new Types.ObjectId(driverId),
  })
  if (!trailer) throw new ApiError(StatusCodes.NOT_FOUND, 'Trailer not found')
  return trailer
}

export interface CreateTrailerData {
  plateNumber: string
  trailerType: TruckType
  lengthFt: number
  unitNumber?: string
  vin?: string
  capacityLbs?: number
  year?: number
  make?: string
  certifications?: Certification[]
  notes?: string
  isPrimary?: boolean
}

const clearOtherPrimaryTrailers = (driverId: string, excludeId?: Types.ObjectId) =>
  TrailerModel.updateMany(
    {
      ownerDriverId: new Types.ObjectId(driverId),
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    },
    { $set: { isPrimary: false } }
  )

export const createTrailer = async (driverId: string, data: CreateTrailerData) => {
  if (!TRUCK_TYPE_VALUES.includes(data.trailerType as TruckType)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid trailer type')
  }
  if (!data.plateNumber?.trim()) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Plate number is required')
  }

  const trailer = await TrailerModel.create({
    ownerDriverId: new Types.ObjectId(driverId),
    ...data,
  })

  if (data.isPrimary) {
    await clearOtherPrimaryTrailers(driverId, trailer._id as Types.ObjectId)
  }

  return trailer
}

export const updateTrailer = async (
  driverId: string,
  trailerId: string,
  data: Partial<CreateTrailerData>
) => {
  assertValidId(trailerId, 'trailerId')

  if (data.isPrimary) {
    await clearOtherPrimaryTrailers(driverId, new Types.ObjectId(trailerId))
  }

  const trailer = await TrailerModel.findOneAndUpdate(
    { _id: new Types.ObjectId(trailerId), ownerDriverId: new Types.ObjectId(driverId) },
    { $set: data },
    { new: true, runValidators: true }
  )
  if (!trailer) throw new ApiError(StatusCodes.NOT_FOUND, 'Trailer not found')
  return trailer
}

export const deleteTrailer = async (driverId: string, trailerId: string) => {
  assertValidId(trailerId, 'trailerId')
  const result = await TrailerModel.deleteOne({
    _id: new Types.ObjectId(trailerId),
    ownerDriverId: new Types.ObjectId(driverId),
  })
  if (result.deletedCount === 0) throw new ApiError(StatusCodes.NOT_FOUND, 'Trailer not found')
}
