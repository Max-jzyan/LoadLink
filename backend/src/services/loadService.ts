import { isValidObjectId, Types } from 'mongoose'
import { StatusCodes } from 'http-status-codes'
import { LoadModel } from '../models/loads/Load'
import { AuctionModel } from '../models/loads/Auction'
import { ReviewModel } from '../models/ratings/Review'
import { TruckModel } from '../models/trucks/Truck'
import { BlocklistModel } from '../models/blocklist/Blocklist'
import { TARGET_TYPES } from '../models/blocklist/Blocklist'
import { LOAD_STATUSES } from '../models/enums'
import { computeRoute } from '../lib/routing'
import { emitLoadPosted } from '../events/auctionEvents'
import { ApiError } from '../utils/ApiError'

interface CreateLoadData {
  startPrice: number
  capPrice: number
  priceCreepAmount: number
  priceCreepIntervalHours?: number
  autoAcceptPercent?: number
  autoAcceptTriggerHours?: number
  expiresAt?: Date
  [key: string]: unknown
}

interface ListCompanyLoadsOptions {
  assignedDriverId?: string
  excludeReviewedBy?: string
  status?: string
}

/**
 * Fetch a single load by its ID with populated references.
 */
export const getLoad = async (loadId: string) => {
  const load = await LoadModel.findById(loadId)
    .populate('companyId')
    .populate('assignedDriverId')
    .populate('auctionId')

  if (!load) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Load not found')
  }

  return load
}

/**
 * Create a new load posting for a company.
 * Creates the load, computes the route, creates the auction, and emits the event.
 */
export const createLoad = async (companyId: string, data: CreateLoadData) => {
  const {
    startPrice,
    capPrice,
    priceCreepAmount,
    priceCreepIntervalHours = 1,
    autoAcceptPercent = 0,
    autoAcceptTriggerHours = 0,
    expiresAt,
    ...loadFields
  } = data

  // Create load immediately as auction_live
  const load = await LoadModel.create({
    ...loadFields,
    companyId,
    createdBy: companyId,
    status: LOAD_STATUSES.AuctionLive,
  })

  // Compute and persist the driving route -> failure is allowed
  const routeSegment = await computeRoute(
    loadFields.originCoords as { lat: number; lng: number },
    loadFields.destinationCoords as { lat: number; lng: number }
  )
  if (routeSegment) {
    load.route = routeSegment
    await load.save()
  }

  // Create the auction
  const auction = await AuctionModel.create({
    loadId: load._id,
    companyId,
    startPrice,
    capPrice,
    priceCreepAmount,
    priceCreepIntervalHours,
    autoAcceptPercent,
    autoAcceptTriggerHours,
    currentPrice: startPrice,
    expiresAt,
  })

  // Link the auction to the load
  load.auctionId = auction._id
  await load.save()

  // Emit event for SSE subscribers
  emitLoadPosted({ loadId: load._id.toString(), companyId: load.companyId.toString() })

  return load
}

// Pricing fields submitted by the load form that live on the Auction doc, not the Load
const AUCTION_FIELD_KEYS = [
  'startPrice',
  'capPrice',
  'priceCreepAmount',
  'priceCreepIntervalHours',
  'autoAcceptPercent',
  'autoAcceptTriggerHours',
  'expiresAt',
] as const

/**
 * Update editable fields on an existing load. Auction pricing fields are
 * split out and applied to the load's auction document.
 */
export const updateLoad = async (loadId: string, updateData: Record<string, unknown>) => {
  const auctionChanges: Record<string, unknown> = {}
  const loadChanges: Record<string, unknown> = { ...updateData }
  for (const key of AUCTION_FIELD_KEYS) {
    if (key in loadChanges) {
      auctionChanges[key] = loadChanges[key]
      delete loadChanges[key]
    }
  }

  const load = await LoadModel.findByIdAndUpdate(loadId, loadChanges, {
    new: true,
    runValidators: true,
  })

  if (!load) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Load not found')
  }

  if (load.auctionId && Object.keys(auctionChanges).length > 0) {
    const auction = await AuctionModel.findById(load.auctionId)
    if (auction) {
      if (typeof auctionChanges.startPrice === 'number') {
        auction.startPrice = auctionChanges.startPrice
        // The live price never sits below the (possibly raised) start price
        if (auction.currentPrice < auctionChanges.startPrice) {
          auction.currentPrice = auctionChanges.startPrice
        }
      }
      if (typeof auctionChanges.capPrice === 'number') {
        auction.capPrice = auctionChanges.capPrice
      }
      if (typeof auctionChanges.priceCreepAmount === 'number') {
        auction.priceCreepAmount = auctionChanges.priceCreepAmount
      }
      if (typeof auctionChanges.priceCreepIntervalHours === 'number') {
        auction.priceCreepIntervalHours = auctionChanges.priceCreepIntervalHours
      }
      if (typeof auctionChanges.autoAcceptPercent === 'number') {
        auction.autoAcceptPercent = auctionChanges.autoAcceptPercent
      }
      if (typeof auctionChanges.autoAcceptTriggerHours === 'number') {
        auction.autoAcceptTriggerHours = auctionChanges.autoAcceptTriggerHours
      }
      if (auctionChanges.expiresAt) {
        auction.expiresAt = new Date(auctionChanges.expiresAt as string)
      }
      await auction.save()
    }
  }

  return load
}

/**
 * List all loads for a specific company with optional filters.
 */
export const listCompanyLoads = async (
  companyId: string,
  options: ListCompanyLoadsOptions = {}
) => {
  const filter: Record<string, unknown> = { companyId }

  if (options.assignedDriverId) {
    filter.assignedDriverId = options.assignedDriverId
  }

  // Exclude loads already reviewed by this company
  if (options.excludeReviewedBy) {
    const reviewedLoadIds = await ReviewModel.distinct('loadId', {
      reviewerId: options.excludeReviewedBy,
    })
    filter._id = { $nin: reviewedLoadIds }
  }

  // Optional status filter (e.g., only completed loads eligible for review)
  if (options.status) {
    filter.status = options.status
  }

  const loads = await LoadModel.find(filter)
    .sort({ createdAt: -1 })
    .populate('assignedDriverId')
    .populate('auctionId')
    .populate('companyId')

  return loads
}

/**
 * List loads that are currently live on the auction board.
 * Supports optional status filter.
 *
 * When `driverId` is provided, loads posted by companies the driver has
 * blocked are excluded (server-side blocklist enforcement).
 */
export const listAvailableLoads = async (
  status?: string,
  driverId?: string
) => {
  const filter: Record<string, unknown> = {}

  // Default to auction_live; allow override via query param
  if (status) {
    filter.status = status
  } else {
    filter.status = LOAD_STATUSES.AuctionLive
  }

  // Exclude loads from companies this driver has blocked
  if (driverId) {
    const driversBlocks = await BlocklistModel.find({
      userId: new Types.ObjectId(driverId),
      targetType: TARGET_TYPES.COMPANY,
      isActive: true,
    }).distinct('targetId')

    // Also exclude loads from companies that have blocked this driver
    const companiesBlockingDriver = await BlocklistModel.find({
      targetId: new Types.ObjectId(driverId),
      targetType: TARGET_TYPES.DRIVER,
      isActive: true,
    }).distinct('userId')

    // Merge both sets of company ids
    const allBlockedCompanyIds = [
      ...(driversBlocks as Types.ObjectId[]).map((id) => id.toString()),
      ...(companiesBlockingDriver as Types.ObjectId[]).map((id) => id.toString()),
    ]

    if (allBlockedCompanyIds.length > 0) {
      filter.companyId = { $nin: [...new Set(allBlockedCompanyIds)] }
    }
  }

  const loads = await LoadModel.find(filter)
    .sort({ createdAt: -1 })
    .populate('companyId')
    .populate('auctionId')

  return loads
}

/**
 * Assign (or clear) the truck a driver intends to use for a specific load.
 * Only the assigned driver may set the truck, and the truck must belong to them.
 */
export const selectTruckForLoad = async (
  loadId: string,
  driverId: string,
  truckId: string | null
) => {
  if (!isValidObjectId(loadId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid loadId')
  }
  if (!isValidObjectId(driverId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid driverId')
  }
  if (truckId !== null && !isValidObjectId(truckId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid truckId')
  }

  const load = await LoadModel.findById(loadId)
  if (!load) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Load not found')
  }

  // The load must be assigned to this driver
  if (!load.assignedDriverId || load.assignedDriverId.toString() !== driverId) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'You are not assigned to this load')
  }

  // If a truck is supplied, verify ownership
  if (truckId !== null) {
    const truck = await TruckModel.findOne({
      _id: new Types.ObjectId(truckId),
      ownerDriverId: new Types.ObjectId(driverId),
    })
    if (!truck) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Truck not found for this driver')
    }
  }

  load.selectedTruckId = truckId === null ? null : new Types.ObjectId(truckId)
  await load.save()

  return load
}
