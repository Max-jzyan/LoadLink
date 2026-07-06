import { StatusCodes } from 'http-status-codes'
import { LoadModel } from '../models/loads/Load'
import { AuctionModel } from '../models/loads/Auction'
import { ReviewModel } from '../models/ratings/Review'
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

/**
 * Update editable fields on an existing load.
 */
export const updateLoad = async (loadId: string, updateData: Record<string, unknown>) => {
  const load = await LoadModel.findByIdAndUpdate(loadId, updateData, {
    new: true,
    runValidators: true,
  })

  if (!load) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Load not found')
  }

  return load
}

/**
 * List all loads for a specific company with optional filters.
 */
export const listCompanyLoads = async (companyId: string, options: ListCompanyLoadsOptions = {}) => {
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
 */
export const listAvailableLoads = async (status?: string) => {
  const filter: Record<string, unknown> = {}

  // Default to auction_live; allow override via query param
  if (status) {
    filter.status = status
  } else {
    filter.status = LOAD_STATUSES.AuctionLive
  }

  const loads = await LoadModel.find(filter)
    .sort({ createdAt: -1 })
    .populate('companyId')
    .populate('auctionId')

  return loads
}