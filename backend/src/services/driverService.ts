import { isValidObjectId, Types } from 'mongoose'
import { StatusCodes } from 'http-status-codes'
import { LOAD_STATUSES } from '../models/enums'
import { BidModel } from '../models/loads/Bid'
import { LoadModel } from '../models/loads/Load'
import { TruckModel } from '../models/trucks/Truck'
import { DriverModel } from '../models/users/Driver'
import { ApiError } from '../utils/ApiError'

// ── helpers ──────────────────────────────────────────────────────────────

const assertValidId = (id: string, label: string) => {
  if (!isValidObjectId(id)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, `Invalid ${label}`)
  }
}

/** Haversine distance between two lat/lng points in km */
export const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371 // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ── service functions ────────────────────────────────────────────────────

/**
 * List all bids placed by a driver. Optional status filter.
 */
export const listDriverBids = async (driverId: string, status?: string) => {
  assertValidId(driverId, 'driverId')

  const filter: Record<string, unknown> = { driverId: new Types.ObjectId(driverId) }
  if (status) {
    filter.status = status
  }

  return await BidModel.find(filter)
    .sort({ createdAt: -1 })
    .populate('loadId')
    .populate('auctionId')
}

/**
 * List loads assigned to a driver. Optional status filter.
 */
export const listDriverLoads = async (driverId: string, status?: string) => {
  assertValidId(driverId, 'driverId')

  const filter: Record<string, unknown> = { assignedDriverId: new Types.ObjectId(driverId) }
  if (status) {
    filter.status = status
  }

  return await LoadModel.find(filter)
    .sort({ createdAt: -1 })
    .populate('companyId')
    .populate('auctionId')
}

/**
 * Fetch loads that match the driver's truck type(s) and are currently on auction.
 */
export const getRecommendedLoads = async (driverId: string) => {
  assertValidId(driverId, 'driverId')

  // Fetch the driver's truck types for matching
  const trucks = await TruckModel.find({ ownerDriverId: new Types.ObjectId(driverId) }).lean()
  const truckTypes = [...new Set(trucks.map((t) => t.truckType))]

  const filter: Record<string, unknown> = {
    status: LOAD_STATUSES.AuctionLive,
  }

  // If the driver has trucks, filter by matching truck types
  if (truckTypes.length > 0) {
    filter.truckType = { $in: truckTypes }
  }

  return await LoadModel.find(filter)
    .sort({ createdAt: -1 })
    .populate('companyId')
    .populate('auctionId')
}

/**
 * Fetch all trucks registered to a driver.
 */
export const listDriverTrucks = async (driverId: string) => {
  assertValidId(driverId, 'driverId')

  return await TruckModel.find({ ownerDriverId: new Types.ObjectId(driverId) }).sort({
    isPrimary: -1,
    createdAt: -1,
  })
}

/**
 * Fetch the full driver profile document with user-level fields merged in.
 */
export const getDriverProfile = async (driverId: string) => {
  assertValidId(driverId, 'driverId')

  const driver = await DriverModel.findById(new Types.ObjectId(driverId))
    .populate('trucks')
    .lean()

  if (!driver) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Driver not found')
  }

  return driver
}

/**
 * Update editable fields on a driver's profile.
 */
export const updateDriverProfile = async (driverId: string, updateData: Record<string, unknown>) => {
  assertValidId(driverId, 'driverId')

  const allowedFields = [
    'professionalTitle',
    'profilePictureUrl',
    'availableForLoads',
    'pricingPreferences',
    'notificationPreferences',
    'homeLocation',
  ]

  const filteredData: Record<string, unknown> = {}
  for (const field of allowedFields) {
    if (updateData[field] !== undefined) {
      filteredData[field] = updateData[field]
    }
  }

  if (Object.keys(filteredData).length === 0) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'No valid fields to update')
  }

  const driver = await DriverModel.findByIdAndUpdate(
    new Types.ObjectId(driverId),
    { $set: filteredData },
    { new: true, runValidators: true }
  )
    .populate('trucks')
    .lean()

  if (!driver) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Driver not found')
  }

  return driver
}

/**
 * Aggregate completed loads and compute revenue, expenses, and profit.
 * Optional query params: dateFrom, dateTo, truckType, minPayout, maxPayout, origin, destination, minDistance, maxDistance
 */
export const getDriverRevenue = async (
  driverId: string,
  queryParams: Record<string, unknown>
) => {
  assertValidId(driverId, 'driverId')

  const driver = await DriverModel.findById(new Types.ObjectId(driverId)).lean()
  if (!driver) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Driver not found')
  }

  // TODO: Maybe change these?
  const expensePrefs = driver.expensePreferences || {
    fuelCostPerLiter: 1.5,
    fuelEfficiencyKmPerLiter: 3.5,
    insurancePerMonth: 500,
    maintenancePerKm: 0.15,
    otherFixedCostsPerMonth: 0,
  }

  // Build filter query
  const filter: Record<string, unknown> = {
    assignedDriverId: new Types.ObjectId(driverId),
    status: LOAD_STATUSES.Completed,
  }

  // Date range filter (by dropoffTime)
  if (queryParams.dateFrom || queryParams.dateTo) {
    const dateFilter: Record<string, Date> = {}
    if (queryParams.dateFrom) dateFilter.$gte = new Date(queryParams.dateFrom as string)
    if (queryParams.dateTo) dateFilter.$lte = new Date(queryParams.dateTo as string)
    filter.dropoffTime = dateFilter
  }

  // Truck type filter
  if (queryParams.truckType) {
    filter.truckType = queryParams.truckType as string
  }

  // Origin/destination text search
  const searchFilters: Record<string, unknown> = {}
  if (queryParams.origin) {
    searchFilters.originAddress = { $regex: queryParams.origin as string, $options: 'i' }
  }
  if (queryParams.destination) {
    searchFilters.destinationAddress = { $regex: queryParams.destination as string, $options: 'i' }
  }

  // Fetch completed loads for this driver
  const completedLoads = await LoadModel.find({
    ...filter,
    ...searchFilters,
  })
    .populate('auctionId')
    .populate('companyId')
    .sort({ createdAt: -1 })
    .lean()

  let totalRevenue = 0
  let totalDistanceKm = 0
  const loadBreakdown: Record<string, unknown>[] = []

  for (const load of completedLoads) {
    const auction = load.auctionId as unknown as { currentPrice?: number; capPrice?: number } | null
    // Use currentPrice from auction as the payout (or capPrice as fallback)
    const payout = auction?.currentPrice ?? auction?.capPrice ?? 0

    // Payout range filter (applied after population)
    if (queryParams.minPayout !== undefined && payout < Number(queryParams.minPayout)) continue
    if (queryParams.maxPayout !== undefined && payout > Number(queryParams.maxPayout)) continue

    // Prefer route distance, fall back to haversine from coordinates
    let distanceKm = load.route?.distanceKm ?? 0
    if (distanceKm <= 0 && load.originCoords && load.destinationCoords) {
      distanceKm = haversineKm(
        load.originCoords.lat,
        load.originCoords.lng,
        load.destinationCoords.lat,
        load.destinationCoords.lng
      )
    }

    // Distance range filter (applied after calculation)
    if (queryParams.minDistance !== undefined && distanceKm < Number(queryParams.minDistance)) continue
    if (queryParams.maxDistance !== undefined && distanceKm > Number(queryParams.maxDistance)) continue

    // Resolve effective expense values: per-load override > driver global default
    const loadOverrides = load.expenseOverrides || {}
    const effFuelCostPerLiter = loadOverrides.fuelCostPerLiter ?? expensePrefs.fuelCostPerLiter
    const effFuelEfficiencyKmPerLiter = loadOverrides.fuelEfficiencyKmPerLiter ?? expensePrefs.fuelEfficiencyKmPerLiter
    const effMaintenancePerKm = loadOverrides.maintenancePerKm ?? expensePrefs.maintenancePerKm

    // Per-load expense estimates
    const fuelCost = distanceKm > 0 && effFuelEfficiencyKmPerLiter > 0
      ? (distanceKm / effFuelEfficiencyKmPerLiter) * effFuelCostPerLiter
      : 0
    const maintenanceCost = distanceKm * effMaintenancePerKm
    const totalLoadExpenses = fuelCost + maintenanceCost
    const netProfit = payout - totalLoadExpenses

    totalRevenue += payout
    totalDistanceKm += distanceKm

    loadBreakdown.push({
      loadId: load._id,
      originAddress: load.originAddress,
      destinationAddress: load.destinationAddress,
      distanceKm: Math.round(distanceKm * 10) / 10,
      payout,
      fuelCost: Math.round(fuelCost * 100) / 100,
      maintenanceCost: Math.round(maintenanceCost * 100) / 100,
      totalExpenses: Math.round(totalLoadExpenses * 100) / 100,
      netProfit: Math.round(netProfit * 100) / 100,
      deliveryDate: load.dropoffTime,
      completedAt: load.updatedAt,
      effectiveFuelCostPerLiter: effFuelCostPerLiter,
      effectiveFuelEfficiencyKmPerLiter: effFuelEfficiencyKmPerLiter,
      effectiveMaintenancePerKm: effMaintenancePerKm,
    })
  }

  // Monthly fixed costs (insurance + other) — prorated by number of completed loads
  const monthlyFixedCosts = expensePrefs.insurancePerMonth + expensePrefs.otherFixedCostsPerMonth
  const totalExpenses = loadBreakdown.reduce(
    (sum: number, lb: any) => sum + lb.totalExpenses,
    0
  ) + monthlyFixedCosts

  const netProfit = totalRevenue - totalExpenses
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0

  const summary = {
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalExpenses: Math.round(totalExpenses * 100) / 100,
    netProfit: Math.round(netProfit * 100) / 100,
    profitMargin: Math.round(profitMargin * 100) / 100,
    totalDistanceKm: Math.round(totalDistanceKm * 100) / 100,
    completedLoadsCount: completedLoads.length,
    monthlyFixedCosts: Math.round(monthlyFixedCosts * 100) / 100,
    loadBreakdown,
    expensePreferences: expensePrefs,
  }

  return summary
}

/**
 * Update the driver's expense preferences.
 */
export const updateDriverExpenses = async (driverId: string, expenseData: Record<string, unknown>) => {
  assertValidId(driverId, 'driverId')

  const allowedExpenseFields = [
    'fuelCostPerLiter',
    'fuelEfficiencyKmPerLiter',
    'insurancePerMonth',
    'maintenancePerKm',
    'otherFixedCostsPerMonth',
  ]

  const filteredExpenseData: Record<string, unknown> = {}
  for (const field of allowedExpenseFields) {
    if (expenseData[field] !== undefined) {
      filteredExpenseData[field] = expenseData[field]
    }
  }

  if (Object.keys(filteredExpenseData).length === 0) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'No valid expense fields to update')
  }

  const driverDoc = await DriverModel.findById(driverId)

  if (!driverDoc) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Driver not found')
  }

  driverDoc.expensePreferences = filteredExpenseData as any
  await driverDoc.save()

  const driver = driverDoc.toObject()
  return driver
}