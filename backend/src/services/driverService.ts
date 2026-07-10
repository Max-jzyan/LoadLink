import { isValidObjectId, Types } from 'mongoose'
import { StatusCodes } from 'http-status-codes'
import { LOAD_STATUSES } from '../models/enums'
import { BidModel } from '../models/loads/Bid'
import { LoadModel } from '../models/loads/Load'
import { TruckModel } from '../models/trucks/Truck'
import { DriverModel } from '../models/users/Driver'
import { ApiError } from '../utils/ApiError'
import * as uploadService from './uploadService'

// ── helpers ─────────────────────────────────────────────────────────────┐
//                                                                     │

/**
 * The bucket has no public read access, so stored S3 URLs 403 if fetched
 * directly — swap them for short-lived presigned GET URLs before returning
 * the driver document to the client.
 */
const withViewableUrls = async (
  driver: Record<string, unknown>
): Promise<Record<string, unknown>> => {
  const profilePictureUrl = driver.profilePictureUrl as string | undefined
  if (profilePictureUrl) {
    driver.profilePictureUrl = await uploadService.toViewableUrl(profilePictureUrl)
  }

  const certificationDocuments = driver.certificationDocuments as
    | { name: string; url: string; key: string; uploadedAt: string }[]
    | undefined
  if (certificationDocuments?.length) {
    driver.certificationDocuments = await Promise.all(
      certificationDocuments.map(async (doc) => ({
        ...doc,
        url: await uploadService.createDownloadUrl(doc.key),
      }))
    )
  }

  return driver
}

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

// ── scoring types ────────────────────────────────────────────────────┐
//                                                                     │

interface EligibilityFlags {
  eligibleTruckType: boolean
  eligibleTrailerLength: boolean
  eligibleCertifications: boolean
  eligibleSchedule: boolean
  eligibleMinRate: boolean
  eligibleMinValue: boolean
  eligibleDeadhead: boolean
  isEligible: boolean
}

interface ScoredLoad {
  loadId: string
  eligibilityFlags: EligibilityFlags
  recommendationScore: number // 0–100
}

// ── service functions ─────────────────────────────────────────────────┐
//                                                                     │

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

  const driver = await DriverModel.findById(new Types.ObjectId(driverId)).populate('trucks').lean()

  if (!driver) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Driver not found')
  }

  return withViewableUrls(driver)
}

/**
 * Update editable fields on a driver's profile.
 */
export const updateDriverProfile = async (
  driverId: string,
  updateData: Record<string, unknown>
) => {
  assertValidId(driverId, 'driverId')

  const allowedFields = [
    'name',
    'phone',
    'professionalTitle',
    'profilePictureUrl',
    'availableForLoads',
    'pricingPreferences',
    'notificationPreferences',
    'homeLocation',
    'certificationDocuments',
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

  // Only one profile picture exists at a time, so replacing it should clean up
  // the old S3 object rather than leaving it orphaned (unlike certification
  // documents, which intentionally accumulate as a growing list).
  if (typeof filteredData.profilePictureUrl === 'string' && filteredData.profilePictureUrl) {
    const existing = await DriverModel.findById(new Types.ObjectId(driverId))
      .select('profilePictureUrl')
      .lean()
    if (
      existing?.profilePictureUrl &&
      existing.profilePictureUrl !== filteredData.profilePictureUrl
    ) {
      await uploadService.deleteObjectByUrl(existing.profilePictureUrl)
    }
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

  return withViewableUrls(driver)
}

/**
 * Aggregate completed loads and compute revenue, expenses, and profit.
 * Optional query params: dateFrom, dateTo, truckType, selectedTruck, minPayout, maxPayout, origin, destination, minDistance, maxDistance
 */
export const getDriverRevenue = async (driverId: string, queryParams: Record<string, unknown>) => {
  assertValidId(driverId, 'driverId')

  const driver = await DriverModel.findById(new Types.ObjectId(driverId)).lean()
  if (!driver) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Driver not found')
  }

  // TODO: Maybe change these?
  const expensePrefs = driver.expensePreferences || {
    fuelCostPerLiter: 1.5,
    fuelEfficiencyKmPerLiter: 3.5,
    maintenancePerKm: 0.15,
    otherFixedCostsPerMonth: 0,
  }

  // Fetch the driver's trucks to resolve per-truck expense prefs & insurance
  const trucks = await TruckModel.find({ ownerDriverId: new Types.ObjectId(driverId) }).lean()
  const truckById = new Map(trucks.map((t) => [t._id.toString(), t]))
  // Total monthly insurance summed across all trucks owned by the driver
  const totalFleetInsurance = trucks.reduce(
    (sum: number, t: any) => sum + (t.expensePreferences?.insurancePerMonth ?? 0),
    0
  )

  // Build filter query — default to completed, accept comma-separated statuses
  const statusParam = (queryParams.status as string) || LOAD_STATUSES.Completed
  const statuses = statusParam.split(',').map((s) => s.trim())

  const filter: Record<string, unknown> = {
    assignedDriverId: new Types.ObjectId(driverId),
    status: { $in: statuses },
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

  // Selected truck filter (by load's selectedTruckId)
  if (queryParams.selectedTruck) {
    const selectedTruck = queryParams.selectedTruck as string
    if (selectedTruck === 'none') {
      filter.selectedTruckId = null
    } else {
      assertValidId(selectedTruck, 'selectedTruck')
      filter.selectedTruckId = new Types.ObjectId(selectedTruck)
    }
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
    if (queryParams.minDistance !== undefined && distanceKm < Number(queryParams.minDistance))
      continue
    if (queryParams.maxDistance !== undefined && distanceKm > Number(queryParams.maxDistance))
      continue

    // Resolve effective expense values:
    // per-load override > truck-specific prefs > driver global default
    const loadOverrides = load.expenseOverrides || {}
    const truckForLoad = load.selectedTruckId
      ? truckById.get((load.selectedTruckId as any).toString())
      : undefined
    const truckExpensePrefs = (truckForLoad as any)?.expensePreferences || {}

    // Insurance: use the selected truck's insurance if a truck is chosen,
    // otherwise fall back to the sum of all trucks' insurance (fleet total).
    const effInsurancePerMonth = truckForLoad
      ? (truckExpensePrefs.insurancePerMonth ?? 0)
      : totalFleetInsurance

    const effFuelCostPerLiter =
      loadOverrides.fuelCostPerLiter ??
      truckExpensePrefs.fuelCostPerLiter ??
      expensePrefs.fuelCostPerLiter
    const effFuelEfficiencyKmPerLiter =
      loadOverrides.fuelEfficiencyKmPerLiter ??
      truckExpensePrefs.fuelEfficiencyKmPerLiter ??
      expensePrefs.fuelEfficiencyKmPerLiter
    const effMaintenancePerKm =
      loadOverrides.maintenancePerKm ??
      truckExpensePrefs.maintenancePerKm ??
      expensePrefs.maintenancePerKm

    // Per-load expense estimates
    const fuelCost =
      distanceKm > 0 && effFuelEfficiencyKmPerLiter > 0
        ? (distanceKm / effFuelEfficiencyKmPerLiter) * effFuelCostPerLiter
        : 0
    const maintenanceCost = distanceKm * effMaintenancePerKm
    const totalLoadExpenses = fuelCost + maintenanceCost
    const netProfit = payout - totalLoadExpenses

    totalRevenue += payout
    totalDistanceKm += distanceKm

    loadBreakdown.push({
      loadId: load._id,
      status: load.status,
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
      effectiveInsurancePerMonth: effInsurancePerMonth,
      selectedTruckId: load.selectedTruckId ? (load.selectedTruckId as any).toString() : null,
      selectedTruckName: truckForLoad
        ? `${(truckForLoad as any).year} ${(truckForLoad as any).make} ${(truckForLoad as any).model} (${(truckForLoad as any).trailerLengthFt}ft)`
        : null,
    })
  }

  // Monthly fixed costs (insurance + other) — insurance is per-truck only;
  // the fleet total is used as the fixed-cost baseline here.
  const monthlyFixedCosts = totalFleetInsurance + (expensePrefs.otherFixedCostsPerMonth ?? 0)
  const totalExpenses =
    loadBreakdown.reduce((sum: number, lb: any) => sum + lb.totalExpenses, 0) + monthlyFixedCosts

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
export const updateDriverExpenses = async (
  driverId: string,
  expenseData: Record<string, unknown>
) => {
  assertValidId(driverId, 'driverId')

  const allowedExpenseFields = [
    'fuelCostPerLiter',
    'fuelEfficiencyKmPerLiter',
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

// ── scoring logic ────────────────────────────────────────────────────┐
//                                                                     │

/** Default-scope scoring weights (hardcoded for v1; extract to config later). */
const SCORE_WEIGHTS = {
  rate: 0.25,
  value: 0.10,
  deadhead: 0.20,
  geographicProximity: 0.20,
  temporalAdjacency: 0.15,
  truckTypeMatch: 0.05,
  competition: 0.05,
}

/**
 * Static coordinate map for major Canadian cities.
 * Used as a fallback when no completed-load history exists.
 */
const CANADIAN_CITY_COORDS: Record<string, [number, number]> = {
  'Vancouver, BC': [49.2827, -123.1207],
  'Calgary, AB': [51.0447, -114.0719],
  'Edmonton, AB': [53.5461, -113.4938],
  'Regina, SK': [50.4452, -104.6189],
  'Saskatoon, SK': [52.1579, -106.6702],
  'Winnipeg, MB': [49.8951, -97.1384],
  'Toronto, ON': [43.6532, -79.3832],
  'Ottawa, ON': [45.4215, -75.6972],
  'Hamilton, ON': [43.2557, -79.8711],
  'London, ON': [42.9849, -81.2453],
  'Montreal, QC': [45.5017, -73.5673],
  'Quebec City, QC': [46.8139, -71.2080],
  'Fredericton, NB': [45.9636, -66.6431],
  'Halifax, NS': [44.6488, -63.5752],
  'Charlottetown, PE': [46.2382, -63.1311],
  "St. John's, NL": [47.5615, -52.7126],
}

interface LatLng {
  lat: number
  lng: number
}

/**
 * Resolve the driver's current location for deadhead calculation.
 *
 * Priority order:
 *   1. Most recent completed load's destination coords
 *   2. Home city via CANADIAN_CITY_COORDS lookup
 *   3. null (deadhead treated as 0 — no penalty)
 */
function getCurrentLocation(
  completedLoads: any[],
  driver: Record<string, any>
): LatLng | null {
  // Priority 1: newest completed load's destination
  if (completedLoads.length > 0) {
    const last = completedLoads[0] as any
    if (last.destinationCoords?.lat != null && last.destinationCoords?.lng != null) {
      return { lat: last.destinationCoords.lat, lng: last.destinationCoords.lng }
    }
  }

  // Priority 2: home city lookup
  const city = driver.homeLocation?.city
  const province = driver.homeLocation?.province
  if (city && province) {
    const key = `${city}, ${province}`
    const coords = CANADIAN_CITY_COORDS[key]
    if (coords) {
      return { lat: coords[0], lng: coords[1] }
    }
  }

  return null
}

/**
 * Compute per-load eligibility flags and a recommendation score (0–100).
 * Returns a flat array of ScoredLoad items, one per available load.
 */
export const getScoredLoads = async (driverId: string) => {
  assertValidId(driverId, 'driverId')

  // ── 1. Fetch driver data ──────────────────────────────────────────────
  const driver = await DriverModel.findById(new Types.ObjectId(driverId))
    .select('pricingPreferences homeLocation')
    .lean()
  if (!driver) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Driver not found')
  }

  const prefs = driver.pricingPreferences ?? {
    minimumRatePerMile: 0,
    minimumLoadValue: 0,
    preferredMaxDeadheadMiles: 0,
  }
  const homeLocation = driver.homeLocation ?? { city: '', province: '', country: '' }

  // ── 2. Fetch driver's trucks (certs live per-truck, not on Driver) ────
  const trucks = await TruckModel.find({ ownerDriverId: new Types.ObjectId(driverId) }).lean()
  const truckTypes = [...new Set(trucks.map((t) => t.truckType))]
  const maxTrailerLength = trucks.reduce((max, t) => Math.max(max, t.trailerLengthFt ?? 0), 0)
  // Collect each truck's certification set; used to check whether at least
  // one truck can satisfy all of a load's required certifications.
  const truckCertSets: Set<string>[] = trucks.map((t) => new Set(t.certifications ?? []))

  // ── 3. Fetch driver's existing assigned loads (for schedule overlap) ──
  const assignedLoads = await LoadModel.find({
    assignedDriverId: new Types.ObjectId(driverId),
    status: { $in: ['booked', 'in_transit'] },
  })
    .select('pickupTime dropoffTime destinationAddress destinationCoords originAddress originCoords')
    .lean()

  // ── 3b. Fetch completed loads (newest first) for deadhead / proximity ──
  const completedLoads = await LoadModel.find({
    assignedDriverId: new Types.ObjectId(driverId),
    status: { $in: ['completed'] },
  })
    .select('destinationCoords dropoffTime')
    .sort({ dropoffTime: -1 })
    .lean()

  // Resolve the driver's current location for deadhead & proximity scoring.
  const driverLocation = getCurrentLocation(completedLoads, driver)

  // ── 4. Fetch all available loads ──────────────────────────────────────
  const availableLoads: any[] = await LoadModel.find({ status: LOAD_STATUSES.AuctionLive })
    .populate('auctionId')
    .populate('companyId')
    .sort({ createdAt: -1 })
    .lean()

  // ── 5. Count existing bids per load for competition metric ────────────
  const loadIds = availableLoads.map((l) => l._id)
  const bidCounts: Record<string, number> = {}
  if (loadIds.length > 0) {
    const agg = await BidModel.aggregate([
      { $match: { loadId: { $in: loadIds.map((id: any) => new Types.ObjectId(id)) } } },
      { $group: { _id: '$loadId', count: { $sum: 1 } } },
    ])
    for (const row of agg) {
      bidCounts[row._id.toString()] = row.count
    }
  }

  // ── 6. Compute for each load ──────────────────────────────────────────
  const kmPerMile = 1.60934
  const maxBidCount = Math.max(1, ...Object.values(bidCounts))

  const results: ScoredLoad[] = availableLoads.map((load: any) => {
    const auction = load.auctionId as any ?? {}
    const currentPrice = auction.currentPrice ?? auction.capPrice ?? 0

    // Distance (prefer route, fall back to haversine)
    let routeKm = load.route?.distanceKm ?? 0
    if (routeKm <= 0 && load.originCoords && load.destinationCoords) {
      routeKm = haversineKm(
        load.originCoords.lat,
        load.originCoords.lng,
        load.destinationCoords.lat,
        load.destinationCoords.lng
      )
    }
    const routeMiles = routeKm / kmPerMile

    // ── Eligibility ──────────────────────────────────────────────────────
    const eligibleTruckType = truckTypes.length === 0 || truckTypes.includes(load.truckType)
    const eligibleTrailerLength = maxTrailerLength === 0 || (load.trailerLengthFt ?? 0) <= maxTrailerLength
    // At least one truck must possess ALL of the load's required certifications.
    const eligibleCertifications =
      !load.certifications?.length ||
      truckCertSets.some((truckCerts) =>
        (load.certifications as string[]).every((c: string) => truckCerts.has(c))
      )

    // Schedule overlap check
    const loadPickup = new Date(load.pickupTime).getTime()
    const loadDropoff = new Date(load.dropoffTime).getTime()
    const eligibleSchedule = !assignedLoads.some((aLoad: any) => {
      const aPickup = new Date(aLoad.pickupTime).getTime()
      const aDropoff = new Date(aLoad.dropoffTime).getTime()
      return loadPickup < aDropoff && loadDropoff > aPickup
    })

    // Minimum rate per mile (rate preference is in $/mile → convert routeKm to miles)
    const effectiveRatePerMile = routeMiles > 0 ? currentPrice / routeMiles : currentPrice
    const eligibleMinRate = prefs.minimumRatePerMile <= 0 || effectiveRatePerMile >= prefs.minimumRatePerMile
    const eligibleMinValue = prefs.minimumLoadValue <= 0 || currentPrice >= prefs.minimumLoadValue

    // Deadhead: haversine distance (in miles) from the driver's current
    // location to this load's origin.  `driverLocation` resolves via
    // priority: last completed-load dropoff → home city → null (no penalty).
    let deadheadMiles = 0
    if (driverLocation && load.originCoords) {
      const deadheadKm = haversineKm(
        driverLocation.lat,
        driverLocation.lng,
        load.originCoords.lat,
        load.originCoords.lng
      )
      deadheadMiles = deadheadKm / kmPerMile
    }
    const eligibleDeadhead =
      prefs.preferredMaxDeadheadMiles <= 0 || deadheadMiles <= prefs.preferredMaxDeadheadMiles

    const isEligible =
      eligibleTruckType &&
      eligibleTrailerLength &&
      eligibleCertifications &&
      eligibleSchedule &&
      eligibleMinRate &&
      eligibleMinValue &&
      eligibleDeadhead

    // ── Scoring ──────────────────────────────────────────────────────────

    // Rate score: how much the effective rate exceeds the minimum (capped at 2x)
    let rateScore = 0
    if (prefs.minimumRatePerMile > 0 && routeMiles > 0) {
      const ratio = effectiveRatePerMile / prefs.minimumRatePerMile
      rateScore = Math.min(100, Math.max(0, ((ratio - 1) / 1) * 100))
    } else if (routeMiles > 0) {
      rateScore = 50 // neutral when no minimum set
    }

    // Value score: logarithmic scale so high-value loads differentiate better.
    //   At minLoadValue (ratio=1):  log2(1)*25  = 0
    //   At 2x min (ratio=2):        log2(2)*25  = 25
    //   At 4x min (ratio=4):        log2(4)*25  = 50
    //   At 8x min (ratio=8):        log2(8)*25  = 75
    //   At 16x min (ratio=16):      log2(16)*25 = 100 (cap)
    let valueScore = 0
    if (prefs.minimumLoadValue > 0) {
      const ratio = currentPrice / prefs.minimumLoadValue
      valueScore = Math.min(100, Math.max(0, Math.log2(ratio) * 25))
    } else {
      valueScore = 50
    }

    // Deadhead score: inverse — lower deadhead is better
    const deadheadScore = deadheadMiles <= 0
      ? 100
      : Math.max(0, 100 - (deadheadMiles / (prefs.preferredMaxDeadheadMiles || 100)) * 100)

    // Geographic proximity: distance from the driver's known location to this
    // load's origin — uses the same `driverLocation` as the deadhead check.
    let proximityScore = 50
    if (driverLocation && load.originCoords) {
      const distKm = haversineKm(
        driverLocation.lat,
        driverLocation.lng,
        load.originCoords.lat,
        load.originCoords.lng
      )
      proximityScore = Math.max(0, 100 - (distKm / 500) * 100) // 500km = 0 score
    }

    // Temporal adjacency: if an existing load ends near this load's origin and pickup time
    let temporalScore = 0
    if (assignedLoads.length > 0) {
      const adjacentLoads = assignedLoads.filter((aLoad: any) => {
        const aDropoff = new Date(aLoad.dropoffTime).getTime()
        const aDest = (aLoad as any).destinationAddress ?? ''
        const lOrigin = load.originAddress ?? ''
        // Check if same city AND dropoff is within 48h of this load's pickup
        const timeDelta = loadPickup - aDropoff
        const sameRegion =
          aDest.toLowerCase().includes(lOrigin.split(',')[0]?.trim().toLowerCase() ?? '') ||
          lOrigin.toLowerCase().includes(aDest.split(',')[0]?.trim().toLowerCase() ?? '')
        return sameRegion && timeDelta >= 0 && timeDelta <= 48 * 60 * 60 * 1000
      })
      temporalScore = adjacentLoads.length > 0 ? 100 : 0
    } else {
      temporalScore = 0
    }

    // Truck-type match bonus
    const truckMatchScore = eligibleTruckType ? 100 : 0

    // Competition score: fewer existing bids = higher score
    const bidCount = bidCounts[load._id.toString()] ?? 0
    const competitionScore = maxBidCount > 0
      ? Math.max(0, 100 - (bidCount / maxBidCount) * 100)
      : 100

    // Weighted total
    const recommendationScore = Math.round(
      rateScore * SCORE_WEIGHTS.rate +
      valueScore * SCORE_WEIGHTS.value +
      deadheadScore * SCORE_WEIGHTS.deadhead +
      proximityScore * SCORE_WEIGHTS.geographicProximity +
      temporalScore * SCORE_WEIGHTS.temporalAdjacency +
      truckMatchScore * SCORE_WEIGHTS.truckTypeMatch +
      competitionScore * SCORE_WEIGHTS.competition
    )

    return {
      loadId: load._id.toString(),
      eligibilityFlags: {
        eligibleTruckType,
        eligibleTrailerLength,
        eligibleCertifications,
        eligibleSchedule,
        eligibleMinRate,
        eligibleMinValue,
        eligibleDeadhead,
        isEligible,
      },
      recommendationScore,
    }
  })

  return results
}
