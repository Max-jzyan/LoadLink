import { Request, Response, NextFunction } from 'express'
import { LoadModel } from '../models/loads/Load'
import { LOAD_STATUSES } from '../models/enums'

/**
 * GET /api/loads/:loadId
 * Fetch a single load by its ID.
 */
export const getLoad = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { loadId } = req.params

    const load = await LoadModel.findById(loadId)
      .populate('companyId')
      .populate('assignedDriverId')
      .populate('auctionId')

    if (!load) {
      res.status(404).json({ message: 'Load not found' })
      return
    }

    res.json(load)
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/company/:companyId/loads
 * Create a new load posting for a company.
 */
export const createLoad = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId } = req.params

    const load = await LoadModel.create({
      ...req.body,
      companyId,
      createdBy: companyId,
    })

    res.status(201).json(load)
  } catch (err) {
    next(err)
  }
}

/**
 * PATCH /api/loads/:loadId
 * Update editable fields on an existing load.
 */
export const updateLoad = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { loadId } = req.params

    const load = await LoadModel.findByIdAndUpdate(loadId, req.body, {
      new: true,
      runValidators: true,
    })

    if (!load) {
      res.status(404).json({ message: 'Load not found' })
      return
    }

    res.json(load)
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/company/:companyId/loads
 * List all loads for a specific company.
 */
export const listCompanyLoads = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId } = req.params

    const loads = await LoadModel.find({ companyId })
      .sort({ createdAt: -1 })
      .populate('assignedDriverId')

    res.json(loads)
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/loads
 * List loads that are currently live on the auction board.
 * Supports optional ?status= query filter.
 */
export const listAvailableLoads = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filter: Record<string, unknown> = {}

    // Default to auction_live; allow override via query param
    if (req.query.status) {
      filter.status = req.query.status
    } else {
      filter.status = LOAD_STATUSES.AuctionLive
    }

    const loads = await LoadModel.find(filter)
      .sort({ createdAt: -1 })
      .populate('companyId')

    res.json(loads)
  } catch (err) {
    next(err)
  }
}