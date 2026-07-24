import { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import { isValidObjectId } from 'mongoose'
import { UserModel } from '../models/users/User'
import { DriverModel } from '../models/users/Driver'
import { LoadModel } from '../models/loads/Load'
import { BidModel } from '../models/loads/Bid'
import { AdminModel } from '../models/users/Admin'
import { AuctionModel } from '../models/loads/Auction'
import { USER_ROLES } from '../models/enums'
import { ApiError } from '../utils/ApiError'
import { generateRateConfirmationPdf } from '../services/pdfService'
import { getFirebaseAuth } from '../lib/firebaseAdmin'
import * as uploadService from '../services/uploadService'
import {
  notifyDocumentApproved,
  notifyDocumentRejected,
  notifyAccountBanned,
  notifyAccountUnbanned,
} from '../services/notificationService'

/**
 * GET /api/admin/documents/download?key=<s3key>
 * Returns a short-lived presigned URL for any document key.
 */
export const getDocumentDownloadUrl = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const key = req.query.key as string
    if (!key) throw new ApiError(StatusCodes.BAD_REQUEST, 'Missing key parameter')
    const url = await uploadService.createDownloadUrl(key)
    res.status(StatusCodes.OK).json({ url })
  } catch (err) {
    next(err)
  }
}

// ── Platform stats ────────────────────────────────────────────────────────────

/**
 * GET /api/admin/stats
 * High-level dashboard numbers.
 */
export const getPlatformStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [totalDrivers, totalCompanies, totalLoads, totalBids, driversWithDocs, revenueAgg] =
      await Promise.all([
        UserModel.countDocuments({ role: USER_ROLES.DRIVER }),
        UserModel.countDocuments({ role: USER_ROLES.COMPANY }),
        LoadModel.countDocuments({}),
        BidModel.countDocuments({}),
        DriverModel.countDocuments({ 'insuranceCertificates.0': { $exists: true } }),
        BidModel.aggregate([
          { $match: { status: 'accepted' } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
      ])

    const totalRevenue = revenueAgg[0]?.total ?? 0

    res.status(StatusCodes.OK).json({
      totalDrivers,
      totalCompanies,
      totalLoads,
      totalBids,
      driversWithDocs,
      totalRevenue,
    })
  } catch (err) {
    next(err)
  }
}

// ── Analytics time series ─────────────────────────────────────────────────────

const DAY_MS = 24 * 60 * 60 * 1000

/** Builds an array of 'YYYY-MM-DD' UTC date strings for the last `days` days (inclusive of today). */
function buildDailyBuckets(days: number): string[] {
  const buckets: string[] = []
  const now = new Date()
  now.setUTCHours(0, 0, 0, 0)
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * DAY_MS)
    buckets.push(d.toISOString().slice(0, 10))
  }
  return buckets
}

/** Fills in zero-value entries for any bucket day missing from the aggregation results. */
function fillSeries(buckets: string[], data: Map<string, number>) {
  return buckets.map((date) => ({ date, value: data.get(date) ?? 0 }))
}

const toBucketMap = (agg: { _id: string; total: number }[]) =>
  new Map(agg.map((a) => [a._id, a.total]))

const DATE_GROUP = (field: string) => ({
  $dateToString: { format: '%Y-%m-%d', date: `$${field}`, timezone: 'UTC' },
})

/**
 * GET /api/admin/analytics?days=30
 * Returns daily time series for the key platform metrics so the dashboard can
 * render day-by-day / week-by-week / month-by-month charts (aggregation of
 * the daily buckets into weeks/months is done client-side).
 */
export const getAdminAnalytics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const requestedDays = parseInt(req.query.days as string, 10)
    const days = Math.min(Math.max(Number.isFinite(requestedDays) ? requestedDays : 30, 7), 365)

    const startDate = new Date(Date.now() - (days - 1) * DAY_MS)
    startDate.setUTCHours(0, 0, 0, 0)

    const [revenueAgg, loadsAgg, bidsAgg, driversAgg, companiesAgg] = await Promise.all([
      BidModel.aggregate([
        { $match: { status: 'accepted', acceptedAt: { $gte: startDate } } },
        { $group: { _id: DATE_GROUP('acceptedAt'), total: { $sum: '$amount' } } },
      ]),
      LoadModel.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: DATE_GROUP('createdAt'), total: { $sum: 1 } } },
      ]),
      BidModel.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: DATE_GROUP('createdAt'), total: { $sum: 1 } } },
      ]),
      UserModel.aggregate([
        { $match: { role: USER_ROLES.DRIVER, createdAt: { $gte: startDate } } },
        { $group: { _id: DATE_GROUP('createdAt'), total: { $sum: 1 } } },
      ]),
      UserModel.aggregate([
        { $match: { role: USER_ROLES.COMPANY, createdAt: { $gte: startDate } } },
        { $group: { _id: DATE_GROUP('createdAt'), total: { $sum: 1 } } },
      ]),
    ])

    const buckets = buildDailyBuckets(days)

    res.status(StatusCodes.OK).json({
      days,
      series: {
        revenue: fillSeries(buckets, toBucketMap(revenueAgg)),
        loads: fillSeries(buckets, toBucketMap(loadsAgg)),
        bids: fillSeries(buckets, toBucketMap(bidsAgg)),
        newDrivers: fillSeries(buckets, toBucketMap(driversAgg)),
        newCompanies: fillSeries(buckets, toBucketMap(companiesAgg)),
      },
    })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/admin/insights
 * "Real-life analytics" for the dashboard: top companies/drivers by volume,
 * most common lanes, and platform activity (active-user counts + a 14-day
 * distribution of when users were last seen).
 */
export const getAdminInsights = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const now = Date.now()

    const [topCompaniesAgg, topDriversAgg, topLanesAgg, activeLast24h, activeLast7d, activeLast30d, totalUsers, lastActiveAgg] =
      await Promise.all([
        BidModel.aggregate([
          { $match: { status: 'accepted' } },
          {
            $lookup: {
              from: 'loads',
              localField: 'loadId',
              foreignField: '_id',
              as: 'load',
            },
          },
          { $unwind: '$load' },
          {
            $group: {
              _id: '$load.companyId',
              totalRevenue: { $sum: '$amount' },
              loadCount: { $sum: 1 },
            },
          },
          { $sort: { totalRevenue: -1 } },
          { $limit: 5 },
          {
            $lookup: {
              from: 'users',
              localField: '_id',
              foreignField: '_id',
              as: 'company',
            },
          },
          { $unwind: '$company' },
          {
            $project: {
              _id: 1,
              totalRevenue: 1,
              loadCount: 1,
              name: '$company.companyName',
            },
          },
        ]),
        BidModel.aggregate([
          { $match: { status: 'accepted' } },
          {
            $group: {
              _id: '$driverId',
              totalRevenue: { $sum: '$amount' },
              bidCount: { $sum: 1 },
            },
          },
          { $sort: { totalRevenue: -1 } },
          { $limit: 5 },
          {
            $lookup: {
              from: 'users',
              localField: '_id',
              foreignField: '_id',
              as: 'driver',
            },
          },
          { $unwind: '$driver' },
          {
            $project: {
              _id: 1,
              totalRevenue: 1,
              bidCount: 1,
              name: '$driver.name',
            },
          },
        ]),
        LoadModel.aggregate([
          {
            $group: {
              _id: {
                origin: {
                  $trim: { input: { $arrayElemAt: [{ $split: ['$originAddress', ','] }, 0] } },
                },
                destination: {
                  $trim: {
                    input: { $arrayElemAt: [{ $split: ['$destinationAddress', ','] }, 0] },
                  },
                },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { count: -1 } },
          { $limit: 5 },
        ]),
        UserModel.countDocuments({ lastActiveAt: { $gte: new Date(now - DAY_MS) } }),
        UserModel.countDocuments({ lastActiveAt: { $gte: new Date(now - 7 * DAY_MS) } }),
        UserModel.countDocuments({ lastActiveAt: { $gte: new Date(now - 30 * DAY_MS) } }),
        UserModel.countDocuments({}),
        UserModel.aggregate([
          { $match: { lastActiveAt: { $gte: new Date(now - 13 * DAY_MS) } } },
          { $group: { _id: DATE_GROUP('lastActiveAt'), total: { $sum: 1 } } },
        ]),
      ])

    const activityBuckets = buildDailyBuckets(14)

    res.status(StatusCodes.OK).json({
      topCompanies: topCompaniesAgg.map((c) => ({
        _id: c._id,
        name: c.name,
        totalRevenue: c.totalRevenue,
        loadCount: c.loadCount,
      })),
      topDrivers: topDriversAgg.map((d) => ({
        _id: d._id,
        name: d.name,
        totalRevenue: d.totalRevenue,
        bidCount: d.bidCount,
      })),
      topLanes: topLanesAgg.map((l) => ({
        origin: l._id.origin,
        destination: l._id.destination,
        count: l.count,
      })),
      activity: {
        totalUsers,
        activeLast24h,
        activeLast7d,
        activeLast30d,
        lastActiveDistribution: fillSeries(activityBuckets, toBucketMap(lastActiveAgg)),
      },
    })
  } catch (err) {
    next(err)
  }
}

// ── User management ───────────────────────────────────────────────────────────

/**
 * GET /api/admin/users?role=driver|company|admin
 */
export const listUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { role } = req.query
    const filter = role ? { role } : {}
    const users = await UserModel.find(filter)
      .select(
        '_id name email phone role createdAt lastActiveAt profilePictureUrl isBanned bannedAt bannedReason bannedBy'
      )
      .sort({ createdAt: -1 })
      .lean()
    res.status(StatusCodes.OK).json(users)
  } catch (err) {
    next(err)
  }
}

/**
 * PATCH /api/admin/users/:userId/ban
 * Body: { reason?: string }
 * Suspends a user's account so they can no longer authenticate.
 * Admins cannot be banned, and an admin cannot ban themselves.
 */
export const banUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.params.userId as string
    const { reason } = req.body as { reason?: string }
    const adminId = req.user!._id

    if (!isValidObjectId(userId)) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'User not found')
    }
    if (userId === adminId) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'You cannot ban your own account')
    }

    const target = await UserModel.findById(userId)
    if (!target) throw new ApiError(StatusCodes.NOT_FOUND, 'User not found')
    if (target.get('role') === USER_ROLES.ADMIN) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Admin accounts cannot be banned')
    }
    if (target.isBanned) {
      return res.status(StatusCodes.OK).json({ message: 'User is already banned' })
    }

    const bannedReason = reason?.trim() || 'No reason provided'
    target.set({
      isBanned: true,
      bannedAt: new Date(),
      bannedReason,
      bannedBy: adminId,
    })
    await target.save()

    await notifyAccountBanned(userId, { reason: bannedReason })

    res.status(StatusCodes.OK).json({ message: 'User banned' })
  } catch (err) {
    next(err)
  }
}

/**
 * PATCH /api/admin/users/:userId/unban
 * Lifts a previously issued ban.
 */
export const unbanUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.params.userId as string
    if (!isValidObjectId(userId)) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'User not found')
    }

    const target = await UserModel.findById(userId)
    if (!target) throw new ApiError(StatusCodes.NOT_FOUND, 'User not found')
    if (!target.isBanned) {
      return res.status(StatusCodes.OK).json({ message: 'User is not banned' })
    }

    target.set({
      isBanned: false,
      bannedAt: null,
      bannedReason: '',
      bannedBy: null,
    })
    await target.save()

    await notifyAccountUnbanned(userId)

    res.status(StatusCodes.OK).json({ message: 'User unbanned' })
  } catch (err) {
    next(err)
  }
}

/**
 * DELETE /api/admin/users/:userId
 * Permanently deletes a user account — both the MongoDB profile AND the
 * underlying Firebase Auth identity, so the person can't just keep using
 * the same Firebase session (or sign back in with the same credentials)
 * after being "deleted". Admins cannot be deleted here, and an admin cannot
 * delete their own account.
 */
export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.params.userId as string
    const adminId = req.user!._id

    if (!isValidObjectId(userId)) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'User not found')
    }
    if (userId === adminId) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'You cannot delete your own account')
    }

    const target = await UserModel.findById(userId).select('role firebaseUid')
    if (!target) throw new ApiError(StatusCodes.NOT_FOUND, 'User not found')
    if (target.get('role') === USER_ROLES.ADMIN) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Admin accounts cannot be deleted')
    }

    await UserModel.deleteOne({ _id: userId })

    // Best-effort: also remove the Firebase Auth identity so the deleted
    // account can't keep authenticating (it would otherwise still hold a
    // valid Firebase session/token, just with no matching Mongo profile).
    // Not fatal if this fails — the Mongo profile is already gone, which is
    // what actually gates access via requireAuth.
    const firebaseAuth = getFirebaseAuth()
    if (firebaseAuth && target.firebaseUid) {
      try {
        await firebaseAuth.deleteUser(target.firebaseUid)
      } catch (firebaseErr) {
        console.error('[adminController] Failed to delete Firebase user:', firebaseErr)
      }
    }

    res.status(StatusCodes.NO_CONTENT).send()
  } catch (err) {
    next(err)
  }
}

// ── Driver document review ────────────────────────────────────────────────────

/**
 * GET /api/admin/drivers
 * All drivers with MC/DOT numbers and document summary.
 */
export const listDrivers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const drivers = await DriverModel.find({})
      .select(
        '_id name email mcNumber dotNumber nscCvorNumber insuranceCertificates certificationDocuments trucks createdAt'
      )
      .populate('trucks', 'make model year plateNumber truckType')
      .sort({ createdAt: -1 })
      .lean()
    res.status(StatusCodes.OK).json(drivers)
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/admin/drivers/:driverId
 * Single driver full profile + documents.
 */
export const getDriverDocuments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const driver = await DriverModel.findById(req.params.driverId as string)
      .select(
        '_id name email phone mcNumber dotNumber nscCvorNumber insuranceCertificates certificationDocuments trucks createdAt'
      )
      .populate('trucks', 'make model year plateNumber vin truckType trailerLengthFt')
      .lean()
    if (!driver) throw new ApiError(StatusCodes.NOT_FOUND, 'Driver not found')
    res.status(StatusCodes.OK).json(driver)
  } catch (err) {
    next(err)
  }
}

/**
 * PATCH /api/admin/drivers/:driverId/insurance/:idx/approve
 */
export const approveInsuranceCert = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const driverId = req.params.driverId as string
    const idx = req.params.idx as string
    const driver = await DriverModel.findById(driverId)
    if (!driver) throw new ApiError(StatusCodes.NOT_FOUND, 'Driver not found')

    const index = parseInt(idx, 10)
    if (isNaN(index) || index < 0 || index >= (driver.insuranceCertificates?.length ?? 0)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid certificate index')
    }

    // Write the approval status directly on the subdocument
    driver.insuranceCertificates[index].verificationStatus = 'approved'
    driver.insuranceCertificates[index].reviewNotes = ''
    await driver.save()

    await notifyDocumentApproved(driverId, { docType: 'Insurance Certificate' })
    res.status(StatusCodes.OK).json({ message: 'Insurance certificate approved' })
  } catch (err) {
    next(err)
  }
}

/**
 * PATCH /api/admin/drivers/:driverId/insurance/:idx/reject
 * Body: { reason?: string }
 */
export const rejectInsuranceCert = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const driverId = req.params.driverId as string
    const idx = req.params.idx as string
    const { reason } = req.body
    const driver = await DriverModel.findById(driverId)
    if (!driver) throw new ApiError(StatusCodes.NOT_FOUND, 'Driver not found')

    const index = parseInt(idx, 10)
    if (isNaN(index) || index < 0 || index >= (driver.insuranceCertificates?.length ?? 0)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid certificate index')
    }

    driver.insuranceCertificates[index].verificationStatus = 'rejected'
    driver.insuranceCertificates[index].reviewNotes = reason ?? ''
    await driver.save()

    await notifyDocumentRejected(driverId, { docType: 'Insurance Certificate', reason })
    res.status(StatusCodes.OK).json({ message: 'Insurance certificate rejected' })
  } catch (err) {
    next(err)
  }
}

/**
 * PATCH /api/admin/drivers/:driverId/certdoc/:idx/approve
 * Approve a certification document by index.
 */
export const approveCertDoc = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const driverId = req.params.driverId as string
    const idx = req.params.idx as string
    const driver = await DriverModel.findById(driverId)
    if (!driver) throw new ApiError(StatusCodes.NOT_FOUND, 'Driver not found')

    const index = parseInt(idx, 10)
    if (isNaN(index) || index < 0 || index >= (driver.certificationDocuments?.length ?? 0)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid document index')
    }

    driver.certificationDocuments[index].verificationStatus = 'approved'
    driver.certificationDocuments[index].reviewNotes = ''
    await driver.save()

    await notifyDocumentApproved(driverId, {
      docType: driver.certificationDocuments[index].name,
    })
    res.status(StatusCodes.OK).json({ message: 'Certification document approved' })
  } catch (err) {
    next(err)
  }
}

/**
 * PATCH /api/admin/drivers/:driverId/certdoc/:idx/reject
 * Body: { reason?: string }
 */
export const rejectCertDoc = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const driverId = req.params.driverId as string
    const idx = req.params.idx as string
    const { reason } = req.body
    const driver = await DriverModel.findById(driverId)
    if (!driver) throw new ApiError(StatusCodes.NOT_FOUND, 'Driver not found')

    const index = parseInt(idx, 10)
    if (isNaN(index) || index < 0 || index >= (driver.certificationDocuments?.length ?? 0)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid document index')
    }

    driver.certificationDocuments[index].verificationStatus = 'rejected'
    driver.certificationDocuments[index].reviewNotes = reason ?? ''
    await driver.save()

    await notifyDocumentRejected(driverId, {
      docType: driver.certificationDocuments[index].name,
      reason,
    })
    res.status(StatusCodes.OK).json({ message: 'Certification document rejected' })
  } catch (err) {
    next(err)
  }
}

// ── Rate Confirmation management ──────────────────────────────────────────────

/**
 * GET /api/admin/rate-confirmations
 * List all accepted bids that have a rate confirmation PDF.
 */
export const listRateConfirmations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bids = await BidModel.find({ rateConfirmationUrl: { $ne: null } })
      .populate(
        'loadId',
        'originAddress destinationAddress pickupTime dropoffTime commodity companyId'
      )
      .populate('driverId', 'name email')
      .sort({ acceptedAt: -1 })
      .lean()
    res.status(StatusCodes.OK).json(bids)
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/admin/bill-of-ladings
 * List all bids that have a generated Bill of Lading PDF.
 */
export const listBillsOfLading = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bids = await BidModel.find({ bolUrl: { $ne: null } })
      .populate(
        'loadId',
        'originAddress destinationAddress pickupTime dropoffTime commodity companyId'
      )
      .populate('driverId', 'name email')
      .sort({ acceptedAt: -1 })
      .lean()
    res.status(StatusCodes.OK).json(bids)
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/admin/loads/:loadId/bids/:bidId/rate-confirmation
 * Manually (re-)generate a Rate Confirmation PDF. Returns the download URL.
 * Also accessible to the company that owns the load (handled in companyRoutes via same handler).
 */
export const generateRateConfirmation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const loadId = req.params.loadId as string
    const bidId = req.params.bidId as string

    const load = await LoadModel.findById(loadId)
      .populate<{
        companyId: { companyName: string; businessAddress?: string }
      }>('companyId')
      .populate<{
        assignedDriverId: {
          name: string
          email: string
          mcNumber?: string
          dotNumber?: string
          nscCvorNumber?: string
        } | null
      }>('assignedDriverId')
      .lean()

    if (!load) throw new ApiError(StatusCodes.NOT_FOUND, 'Load not found')

    const bid = await BidModel.findById(bidId)
    if (!bid) throw new ApiError(StatusCodes.NOT_FOUND, 'Bid not found')

    const auction = await AuctionModel.findOne({ loadId })
    const company = load.companyId as any
    const driver = load.assignedDriverId as any

    const pdfResult = await generateRateConfirmationPdf({
      loadId,
      bidId,
      companyName: company?.companyName ?? 'Unknown Company',
      companyAddress: company?.businessAddress,
      driverName: driver?.name ?? 'Unknown Driver',
      driverEmail: driver?.email,
      mcNumber: driver?.mcNumber ?? undefined,
      dotNumber: driver?.dotNumber ?? undefined,
      nscCvorNumber: driver?.nscCvorNumber ?? undefined,
      originAddress: load.originAddress,
      destinationAddress: load.destinationAddress,
      pickupTime: new Date(load.pickupTime),
      dropoffTime: new Date(load.dropoffTime),
      commodity: load.commodity,
      weightLbs: load.weightLbs,
      truckType: load.truckType,
      finalPayout: bid.amount,
      currency: (auction?.currency as string) ?? 'CAD',
      confirmedAt: new Date(),
    })

    await BidModel.findByIdAndUpdate(bidId, {
      rateConfirmationKey: pdfResult.key,
      rateConfirmationUrl: pdfResult.url,
    })

    res.status(StatusCodes.OK).json({ url: pdfResult.url, key: pdfResult.key })
  } catch (err) {
    next(err)
  }
}

// ── Admin profile ─────────────────────────────────────────────────────────────

/**
 * GET /api/admin/me
 */
export const getAdminProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const admin = await AdminModel.findById(req.user!._id).lean()
    if (!admin) throw new ApiError(StatusCodes.NOT_FOUND, 'Admin not found')
    res.status(StatusCodes.OK).json(admin)
  } catch (err) {
    next(err)
  }
}
