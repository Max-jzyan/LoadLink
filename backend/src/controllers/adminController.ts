import { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import { UserModel } from '../models/users/User'
import { DriverModel } from '../models/users/Driver'
import { LoadModel } from '../models/loads/Load'
import { BidModel } from '../models/loads/Bid'
import { AdminModel } from '../models/users/Admin'
import { AuctionModel } from '../models/loads/Auction'
import { USER_ROLES } from '../models/enums'
import { ApiError } from '../utils/ApiError'
import { generateRateConfirmationPdf } from '../services/pdfService'
import * as uploadService from '../services/uploadService'
import { notifyDocumentApproved, notifyDocumentRejected } from '../services/notificationService'

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
    const [totalDrivers, totalCompanies, totalLoads, totalBids, driversWithDocs] =
      await Promise.all([
        UserModel.countDocuments({ role: USER_ROLES.DRIVER }),
        UserModel.countDocuments({ role: USER_ROLES.COMPANY }),
        LoadModel.countDocuments({}),
        BidModel.countDocuments({}),
        DriverModel.countDocuments({ 'insuranceCertificates.0': { $exists: true } }),
      ])

    res.status(StatusCodes.OK).json({
      totalDrivers,
      totalCompanies,
      totalLoads,
      totalBids,
      driversWithDocs,
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
      .select('_id name email role createdAt lastActiveAt profilePictureUrl')
      .sort({ createdAt: -1 })
      .lean()
    res.status(StatusCodes.OK).json(users)
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
