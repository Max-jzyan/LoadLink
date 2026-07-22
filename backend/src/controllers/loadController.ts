import { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import { isValidObjectId, Types } from 'mongoose'
import { LoadModel } from '../models/loads/Load'
import { BidModel } from '../models/loads/Bid'
import { ApiError } from '../utils/ApiError'
import * as loadService from '../services/loadService'
import { LOAD_STATUSES, BID_STATUSES } from '../models/enums'
import { parseLatLng } from '../utils/geo'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { s3Client, S3_BUCKET } from '../config/s3Client'

/**
 * GET /api/loads/:loadId/accepted-bid
 * Return the accepted bid (including rateConfirmationUrl) for a load.
 * Returns null if no bid has been accepted yet.
 * Accessible to authenticated users (company, driver, admin).
 */
export const getAcceptedBid = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const loadId = req.params.loadId as string
    if (!isValidObjectId(loadId)) throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid loadId')

    const bid = await BidModel.findOne({
      loadId: new Types.ObjectId(loadId),
      status: BID_STATUSES.Accepted,
    })
      .select(
        '_id driverId amount acceptedAt rateConfirmationUrl rateConfirmationKey bolKey bolUrl signedBolKey signedBolUrl'
      )
      .lean()

    res.status(StatusCodes.OK).json(bid ?? null)
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/loads/:loadId
 * Fetch a single load by its ID.
 */
export const getLoad = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { loadId } = req.params
    const load = await loadService.getLoad(loadId as string)
    res.status(StatusCodes.OK).json(load)
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
    const companyId = req.params.companyId as string
    const load = await loadService.createLoad(companyId, req.body)
    res.status(StatusCodes.CREATED).json(load)
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/loads/stream
 * Global SSE channel: pings all connected clients whenever a new load is posted.
 */
export const streamNewLoads = async (req: Request, res: Response) => {
  const { initSSE, sendSSE, startSSEKeepAlive } = await import('../utils/sse')
  const { onLoadPosted } = await import('../events/auctionEvents')

  initSSE(res)
  const keepAlive = startSSEKeepAlive(res)
  const unsubscribe = onLoadPosted((payload) => sendSSE(res, payload))

  req.on('close', () => {
    clearInterval(keepAlive)
    unsubscribe()
    res.end()
  })
}

/**
 * PATCH /api/loads/:loadId
 * Update editable fields on an existing load.
 */
export const updateLoad = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { loadId } = req.params
    const load = await loadService.updateLoad(loadId as string, req.body)
    res.status(StatusCodes.OK).json(load)
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/company/:companyId/loads
 * List all loads for a specific company.
 * Optional query: ?assignedDriverId=<id> to filter by driver.
 * Optional query: ?excludeReviewedBy=<id> to exclude already-reviewed loads.
 */
export const listCompanyLoads = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyId } = req.params
    const options = {
      assignedDriverId: req.query.assignedDriverId as string | undefined,
      excludeReviewedBy: req.query.excludeReviewedBy as string | undefined,
      status: req.query.status as string | undefined,
    }
    const loads = await loadService.listCompanyLoads(companyId as string, options)
    res.status(StatusCodes.OK).json(loads)
  } catch (err) {
    next(err)
  }
}

/**
 * PATCH /api/driver/:driverId/loads/:loadId/status
 * Update the status of a load assigned to a driver.
 * Only the assigned driver can update the status.
 */
export const updateLoadStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { loadId } = req.params
    const driverId = req.user!._id

    if (!isValidObjectId(loadId)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid loadId')
    }

    const load = await LoadModel.findById(loadId)
    if (!load) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Load not found')
    }

    // Check if this driver is assigned to this load
    if (!load.assignedDriverId || load.assignedDriverId.toString() !== driverId) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Load is not assigned to this driver')
    }

    const allowedStatuses = [
      LOAD_STATUSES.InTransit,
      LOAD_STATUSES.Completed,
      LOAD_STATUSES.Booked,
      LOAD_STATUSES.Cancelled,
    ]
    if (!allowedStatuses.includes(req.body.status)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid status value')
    }

    const updated = await LoadModel.findByIdAndUpdate(
      loadId,
      { status: req.body.status },
      { new: true }
    )
    res.status(StatusCodes.OK).json(updated)
  } catch (err) {
    next(err)
  }
}

/**
 * PATCH /api/loads/:loadId/expenses
 * Update per-load expense overrides for a specific load.
 * Only the assigned driver can update these fields.
 * Note: requireOwns(driverOwnsAssignedLoad) middleware already validates driver ownership.
 */
export const updateLoadExpenses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { loadId } = req.params

    if (!isValidObjectId(loadId)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid loadId')
    }

    const load = await LoadModel.findById(loadId)
    if (!load) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Load not found')
    }

    // Check if there's an assigned driver (handled by middleware for ownership validation)
    if (!load.assignedDriverId) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'No assigned driver for this load')
    }

    const allowedFields = ['fuelCostPerLiter', 'fuelEfficiencyKmPerLiter', 'maintenancePerKm']

    const updateData: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        // Allow setting to null to clear the override (fall back to global defaults)
        updateData[`expenseOverrides.${field}`] = req.body[field] === null ? null : req.body[field]
      }
    }

    if (Object.keys(updateData).length === 0) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'No valid expense fields to update')
    }

    const updated = await LoadModel.findByIdAndUpdate(
      loadId,
      { $set: updateData },
      { new: true, runValidators: true }
    )

    res.status(StatusCodes.OK).json(updated)
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
    const status = req.query.status as string | undefined
    // Use the authenticated user's id (req.user) when available so that
    // loads from companies they have blocked are excluded server-side.
    const driverId = req.user?._id?.toString()
    const loads = await loadService.listAvailableLoads(status, driverId)
    res.status(StatusCodes.OK).json(loads)
  } catch (err) {
    next(err)
  }
}

/**
 * PATCH /api/loads/:loadId/select-truck
 * Assign (or clear) the truck a driver intends to use for a specific load.
 */
export const selectTruckForLoad = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const loadId = req.params.loadId as string

    // Resolve the driver id from the authenticated user (firebaseUid -> driver doc)
    const { DriverModel } = await import('../models/users/Driver')
    const driver = await DriverModel.findOne({ firebaseUid: req.firebaseUid })
    if (!driver) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Driver not found')
    }

    const truckId = req.body.truckId === undefined ? null : (req.body.truckId as string | null)
    // Cast driver._id to string - use String constructor to ensure proper type
    const driverId = String(driver._id as Types.ObjectId)
    const load = await loadService.selectTruckForLoad(loadId, driverId, truckId)
    res.status(StatusCodes.OK).json(load)
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/loads/:loadId/bol
 * Return a fresh presigned URL for the Bill of Lading PDF on the accepted bid.
 * Accessible to the assigned driver, the load's company, and admins.
 */
export const getBol = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const loadId = req.params.loadId as string
    if (!isValidObjectId(loadId)) throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid loadId')

    const TTL = 7 * 24 * 3600 // 7 days

    // ── Helper: generate + store BOL from load data ──────────────────────────
    const generateAndStore = async (
      load: Awaited<ReturnType<typeof LoadModel.findById>> & { [k: string]: any },
      bidId: string | null
    ) => {
      const { generateBillOfLadingPdf } = await import('../services/pdfService')
      const company = load.companyId as any
      const driver = load.assignedDriverId as any
      const bolResult = await generateBillOfLadingPdf({
        loadId,
        bidId: bidId ?? loadId, // use loadId as synthetic bidId for seeded/direct loads
        shipperName: company?.companyName ?? 'Unknown Shipper',
        shipperAddress: company?.businessAddress,
        shipperContact: company?.contactName,
        carrierName: driver?.name ?? 'Unknown Carrier',
        driverName: driver?.name ?? 'Unknown Driver',
        driverPhone: driver?.phone,
        originAddress: load.originAddress,
        destinationAddress: load.destinationAddress,
        commodity: load.commodity,
        weightLbs: load.weightLbs,
        currency: 'CAD',
        pickupDate: new Date(load.pickupTime),
        deliveryDate: new Date(load.dropoffTime),
        issuedAt: new Date(),
      })
      return bolResult
    }

    // ── 1. Try the accepted bid first (auction flow) ─────────────────────────
    const bid = await BidModel.findOne({
      loadId: new Types.ObjectId(loadId),
      status: BID_STATUSES.Accepted,
    })
      .select('_id bolKey bolUrl signedBolKey signedBolUrl')
      .lean()

    if (bid?.bolKey) {
      // Known key — just refresh the presigned URL
      const getCmd = new GetObjectCommand({ Bucket: S3_BUCKET, Key: bid.bolKey })
      const freshBolUrl = await getSignedUrl(s3Client, getCmd, { expiresIn: TTL })

      let freshSignedBolUrl: string | null = null
      if (bid.signedBolKey) {
        const sCmd = new GetObjectCommand({ Bucket: S3_BUCKET, Key: bid.signedBolKey })
        freshSignedBolUrl = await getSignedUrl(s3Client, sCmd, { expiresIn: TTL })
      }

      await BidModel.findByIdAndUpdate(bid._id, {
        bolUrl: freshBolUrl,
        ...(freshSignedBolUrl ? { signedBolUrl: freshSignedBolUrl } : {}),
      })

      return res.status(StatusCodes.OK).json({
        bidId: bid._id,
        bolUrl: freshBolUrl,
        signedBolUrl: freshSignedBolUrl,
      })
    }

    // ── 2. No accepted bid (seeded / directly-assigned loads) ────────────────
    // Fall back to bolKey stored directly on the Load document.
    const load = await LoadModel.findById(loadId)
      .populate<{ companyId: any }>('companyId')
      .populate<{ assignedDriverId: any }>('assignedDriverId')
      .lean()

    if (!load) throw new ApiError(StatusCodes.NOT_FOUND, 'Load not found')
    if (!load.assignedDriverId) {
      // No driver assigned yet — cannot generate BOL
      return res.status(StatusCodes.OK).json({ bidId: null, bolUrl: null, signedBolUrl: null })
    }

    if ((load as any).bolKey) {
      // Already generated for this load — just refresh the URL
      const getCmd = new GetObjectCommand({ Bucket: S3_BUCKET, Key: (load as any).bolKey })
      const freshBolUrl = await getSignedUrl(s3Client, getCmd, { expiresIn: TTL })
      await LoadModel.findByIdAndUpdate(loadId, { bolUrl: freshBolUrl })
      return res.status(StatusCodes.OK).json({ bidId: null, bolUrl: freshBolUrl, signedBolUrl: null })
    }

    // ── 3. Lazy-generate for the first time ──────────────────────────────────
    try {
      const bolResult = await generateAndStore(load as any, bid?._id?.toString() ?? null)
      // Store on both Bid (if exists) and Load (fallback)
      if (bid) {
        await BidModel.findByIdAndUpdate(bid._id, { bolKey: bolResult.key, bolUrl: bolResult.url })
      }
      await LoadModel.findByIdAndUpdate(loadId, { bolKey: bolResult.key, bolUrl: bolResult.url })

      return res.status(StatusCodes.OK).json({
        bidId: bid?._id ?? null,
        bolUrl: bolResult.url,
        signedBolUrl: null,
      })
    } catch (err) {
      console.error('[loadController] Lazy BOL generation failed:', err)
      return res.status(StatusCodes.OK).json({ bidId: null, bolUrl: null, signedBolUrl: null })
    }
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/loads/:loadId/bol/signed
 * Driver submits their signed/stamped Bill of Lading after delivery.
 * Body: { s3Key: string } — the S3 key of the scanned signed BOL the driver
 * already uploaded via the standard document upload pipeline.
 *
 * On success:
 *  - Stores the signed BOL key/URL on the accepted bid.
 *  - Notifies the company that the signed copy is ready to review.
 */
export const submitSignedBol = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const loadId = req.params.loadId as string
    const driverId = req.user!._id

    if (!isValidObjectId(loadId)) throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid loadId')

    const { s3Key } = req.body as { s3Key?: string }
    if (!s3Key) throw new ApiError(StatusCodes.BAD_REQUEST, 'Missing s3Key in request body')

    const load = await LoadModel.findById(loadId).lean()
    if (!load) throw new ApiError(StatusCodes.NOT_FOUND, 'Load not found')

    // Only the assigned driver may submit
    if (!load.assignedDriverId || load.assignedDriverId.toString() !== driverId) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'Only the assigned driver may submit the signed BOL')
    }

    const bid = await BidModel.findOne({
      loadId: new Types.ObjectId(loadId),
      status: BID_STATUSES.Accepted,
    })
    if (!bid) throw new ApiError(StatusCodes.NOT_FOUND, 'No accepted bid found for this load')

    // Generate presigned URL for the uploaded signed document
    const getCmd = new GetObjectCommand({ Bucket: S3_BUCKET, Key: s3Key })
    const signedBolUrl = await getSignedUrl(s3Client, getCmd, { expiresIn: 7 * 24 * 3600 })

    await BidModel.findByIdAndUpdate(bid._id, { signedBolKey: s3Key, signedBolUrl })

    // Notify the company a signed BOL is ready for review
    const { notifyBolSignedSubmitted } = await import('../services/notificationService')
    const { DriverModel } = await import('../models/users/Driver')
    const driver = await DriverModel.findOne({ firebaseUid: req.firebaseUid }).lean()
    const driverName = (driver as any)?.name ?? 'Your driver'

    await notifyBolSignedSubmitted(load.companyId.toString(), {
      loadId,
      bidId: bid._id.toString(),
      driverName,
      signedBolUrl,
    })

    res.status(StatusCodes.OK).json({ signedBolUrl })
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/loads/:loadId/checkin
 * Record the assigned driver's approximate current location ping on an
 * in-transit load, and notify the company.
 */
export const submitCheckIn = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const loadId = req.params.loadId as string
    const driverId = req.user!._id

    const coords = parseLatLng(req.body.lat, req.body.lng)
    if (!coords) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid lat/lng')
    }

    const load = await loadService.submitCheckIn(loadId, driverId, coords)
    res.status(StatusCodes.OK).json(load)
  } catch (err) {
    next(err)
  }
}
