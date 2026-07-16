import { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import { CompanyModel } from '../models/users/Company'
import { LoadModel } from '../models/loads/Load'
import { BidModel } from '../models/loads/Bid'
import { LOAD_STATUSES } from '../models/enums'
import * as companyService from '../services/companyService'

// GET /api/companies
// lists all companies -- dev only, replace with auth-based lookup once firebase auth is wired up
export const listCompanies = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const companies = await CompanyModel.find({}).select('_id name email companyName contactName')
    res.status(StatusCodes.OK).json(companies)
  } catch (err) {
    next(err)
  }
}

// GET /api/company/:companyId/dashboard
// returns all company loads enriched with per-load bid counts and populated auction data,
// plus summary stats for the dashboard header cards
export const getCompanyDashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId } = req.params

    // fetch all loads for this company sorted newest first, populate auction and driver info
    const loads = await LoadModel.find({ companyId })
      .sort({ createdAt: -1 })
      .populate('auctionId')
      .populate('assignedDriverId')

    const loadIds = loads.map((l) => l._id)

    // count bids per load using aggregation to avoid n+1 queries
    const bidCounts = await BidModel.aggregate([
      { $match: { loadId: { $in: loadIds } } },
      { $group: { _id: '$loadId', count: { $sum: 1 } } },
    ])

    const bidCountMap = new Map<string, number>(
      bidCounts.map((bc) => [bc._id.toString(), bc.count as number])
    )

    // count bids submitted today across all company loads for the summary card
    const startOfDay = new Date()
    startOfDay.setUTCHours(0, 0, 0, 0)
    const totalBidsToday = await BidModel.countDocuments({
      loadId: { $in: loadIds },
      createdAt: { $gte: startOfDay },
    })

    // attach bid count to each serialized load
    const enrichedLoads = loads.map((load) => ({
      ...load.toJSON(),
      bidCount: bidCountMap.get(load._id.toString()) ?? 0,
    }))

    // derive summary counts from load statuses
    const summary = {
      // active = any load that is running (auction, booked, or moving)
      activeLoads: loads.filter((l) =>
        (
          [
            LOAD_STATUSES.AuctionLive,
            LOAD_STATUSES.AuctionClosed,
            LOAD_STATUSES.Booked,
            LOAD_STATUSES.InTransit,
          ] as string[]
        ).includes(l.status)
      ).length,
      liveAuctions: loads.filter((l) => l.status === LOAD_STATUSES.AuctionLive).length,
      inTransit: loads.filter((l) => l.status === LOAD_STATUSES.InTransit).length,
      totalBidsToday,
    }

    res.status(StatusCodes.OK).json({ loads: enrichedLoads, summary })
  } catch (err) {
    next(err)
  }
}

// GET /api/company/:companyId/profile
// Returns the full company profile with presigned URLs for S3 assets
export const getCompanyProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const companyId = req.params.companyId as string
    const profile = await companyService.getCompanyProfile(companyId)
    res.status(StatusCodes.OK).json(profile)
  } catch (err) {
    next(err)
  }
}

// PATCH /api/company/:companyId/profile
// Updates editable company profile fields
export const updateCompanyProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const companyId = req.params.companyId as string
    const profile = await companyService.updateCompanyProfile(companyId, req.body)
    res.status(StatusCodes.OK).json(profile)
  } catch (err) {
    next(err)
  }
}
