import { isValidObjectId, Types } from 'mongoose'
import { StatusCodes } from 'http-status-codes'
import { TruckModel } from '../models/trucks/Truck'
import { DriverModel } from '../models/users/Driver'
import { TruckType, TRUCK_TYPE_VALUES, Certification, CERTIFICATION_VALUES } from '../models/enums'
import { ApiError } from '../utils/ApiError'

const assertValidId = (id: string, label: string) => {
  if (!isValidObjectId(id)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, `Invalid ${label}`)
  }
}

/**
 * Fetch all trucks belonging to a driver, sorted by primary first then newest.
 */
export const listTrucks = async (driverId: string) => {
  const trucks = await TruckModel.find({ ownerDriverId: new Types.ObjectId(driverId) }).sort({
    isPrimary: -1,
    createdAt: -1,
  })

  return trucks
}

/**
 * Fetch a single truck by its ID (scoped to the owner driver).
 */
export const getTruck = async (driverId: string, truckId: string) => {
  assertValidId(truckId, 'truckId')

  const truck = await TruckModel.findOne({
    _id: new Types.ObjectId(truckId),
    ownerDriverId: new Types.ObjectId(driverId),
  })

  if (!truck) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Truck not found')
  }

  return truck
}

/**
 * Create a new truck for a driver. If it's the driver's first truck, auto-set isPrimary.
 */
export const createTruck = async (
  driverId: string,
  data: {
    make: string
    model: string
    year: number
    truckType: TruckType
    trailerLengthFt: number
    capacityLbs: number
    maxPayloadLbs?: number
    plateNumber: string
    vin?: string
    certifications?: Certification[]
    isPrimary?: boolean
    notes?: string
  }
) => {
  if (!TRUCK_TYPE_VALUES.includes(data.truckType as TruckType)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, `Invalid truck type: ${data.truckType}`)
  }
  if (data.certifications) {
    for (const cert of data.certifications) {
      if (!CERTIFICATION_VALUES.includes(cert as Certification)) {
        throw new ApiError(StatusCodes.BAD_REQUEST, `Invalid certification: ${cert}`)
      }
    }
  }
  // Count existing trucks to decide primary status
  const existingCount = await TruckModel.countDocuments({
    ownerDriverId: new Types.ObjectId(driverId),
  })

  const isPrimary = data.isPrimary ?? existingCount === 0

  if (isPrimary) {
    // Unset any existing primary flag for this driver
    await TruckModel.updateMany(
      { ownerDriverId: new Types.ObjectId(driverId) },
      { $set: { isPrimary: false } }
    )
  }

  const savedTruck = await TruckModel.create({
    ...data,
    ownerDriverId: new Types.ObjectId(driverId),
    isPrimary,
  })

  // Ensure the driver doc references this truck
  await DriverModel.findByIdAndUpdate(driverId, {
    $addToSet: { trucks: savedTruck._id },
  })

  return savedTruck
}

/**
 * Update fields on an existing truck.
 */
export const updateTruck = async (
  driverId: string,
  truckId: string,
  data: {
    make?: string
    model?: string
    year?: number
    truckType?: TruckType
    trailerLengthFt?: number
    capacityLbs?: number
    maxPayloadLbs?: number
    plateNumber?: string
    vin?: string
    certifications?: Certification[]
    isPrimary?: boolean
    notes?: string
  }
) => {
  if (data.truckType && !TRUCK_TYPE_VALUES.includes(data.truckType as TruckType)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, `Invalid truck type: ${data.truckType}`)
  }
  if (data.certifications) {
    for (const cert of data.certifications) {
      if (!CERTIFICATION_VALUES.includes(cert as Certification)) {
        throw new ApiError(StatusCodes.BAD_REQUEST, `Invalid certification: ${cert}`)
      }
    }
  }
  assertValidId(truckId, 'truckId')

  const truck = await TruckModel.findOne({
    _id: new Types.ObjectId(truckId),
    ownerDriverId: new Types.ObjectId(driverId),
  })

  if (!truck) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Truck not found')
  }

  // Handle primary flag changes
  if (data.isPrimary === true && !truck.isPrimary) {
    // Unset all other primary flags for this driver, then set this one
    await TruckModel.updateMany(
      { ownerDriverId: new Types.ObjectId(driverId), _id: { $ne: truck._id } },
      { $set: { isPrimary: false } }
    )
  }

  Object.assign(truck, data)
  await truck.save()

  return truck
}

/**
 * Delete a truck by its ID (scoped to the owner driver).
 * If it was the primary truck, reassign primary to the next available.
 */
export const deleteTruck = async (driverId: string, truckId: string) => {
  assertValidId(truckId, 'truckId')

  const truck = await TruckModel.findOneAndDelete({
    _id: new Types.ObjectId(truckId),
    ownerDriverId: new Types.ObjectId(driverId),
  })

  if (!truck) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Truck not found')
  }

  // Remove the reference from the driver doc
  await DriverModel.findByIdAndUpdate(driverId, {
    $pull: { trucks: truck._id },
  })

  // If the deleted truck was primary, promote the next oldest truck to primary
  if (truck.isPrimary) {
    const nextTruck = await TruckModel.findOne({
      ownerDriverId: new Types.ObjectId(driverId),
    }).sort({ createdAt: 1 })

    if (nextTruck) {
      nextTruck.isPrimary = true
      await nextTruck.save()
    }
  }
}

/**
 * Update the expense preferences for a specific truck.
 */
export const updateTruckExpenses = async (
  driverId: string,
  truckId: string,
  expenseData: Record<string, unknown>
) => {
  assertValidId(driverId, 'driverId')
  assertValidId(truckId, 'truckId')

  const allowedFields = [
    'fuelCostPerLiter',
    'fuelEfficiencyKmPerLiter',
    'insurancePerMonth',
    'maintenancePerKm',
    'otherFixedCostsPerMonth',
  ]

  const filteredData: Record<string, unknown> = {}
  for (const field of allowedFields) {
    if (expenseData[field] !== undefined) {
      // Allow null for the nullable (fallback) fields; insurance is not nullable
      if (field === 'insurancePerMonth') {
        filteredData[`expensePreferences.${field}`] = expenseData[field]
      } else {
        filteredData[`expensePreferences.${field}`] =
          expenseData[field] === null ? null : expenseData[field]
      }
    }
  }

  if (Object.keys(filteredData).length === 0) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'No valid expense fields to update')
  }

  const truck = await TruckModel.findOneAndUpdate(
    {
      _id: new Types.ObjectId(truckId),
      ownerDriverId: new Types.ObjectId(driverId),
    },
    { $set: filteredData },
    { new: true, runValidators: true }
  )

  if (!truck) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Truck not found')
  }

  return truck
}

/**
 * Set a specific truck as the primary truck for a driver.
 */
export const setPrimaryTruck = async (driverId: string, truckId: string) => {
  assertValidId(truckId, 'truckId')

  const truck = await TruckModel.findOne({
    _id: new Types.ObjectId(truckId),
    ownerDriverId: new Types.ObjectId(driverId),
  })

  if (!truck) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Truck not found')
  }

  // Unset all primary flags for this driver, then set the target
  await TruckModel.updateMany(
    { ownerDriverId: new Types.ObjectId(driverId) },
    { $set: { isPrimary: false } }
  )

  truck.isPrimary = true
  await truck.save()

  return truck
}
