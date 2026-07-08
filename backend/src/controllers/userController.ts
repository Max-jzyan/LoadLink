import { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import { UserModel } from '../models/users/User'
import { DriverModel } from '../models/users/Driver'
import { CompanyModel } from '../models/users/Company'
import { USER_ROLES } from '../models/enums'
import { ApiError } from '../utils/ApiError'

interface UploadedDocument {
  name: string
  url: string
  key: string
}

// POST /api/users/register
// Called right after Firebase signup to save the user role in MongoDB
// Body: { firebaseUid, name, email, role: 'driver' | 'company', certificationDocuments?, businessDocuments?, profilePictureUrl? }
// certificationDocuments/businessDocuments/profilePictureUrl are already-uploaded
// S3 file records (see uploadService) collected by the frontend during the
// signup flow.
// Creates a Driver or Company discriminator document.
// Idempotent
export const registerUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, role, certificationDocuments, businessDocuments, profilePictureUrl } =
      req.body as {
        name: string
        email: string
        role: string
        certificationDocuments?: UploadedDocument[]
        businessDocuments?: UploadedDocument[]
        profilePictureUrl?: string
      }

    const firebaseUid = req.firebaseUid

    if (!firebaseUid || !name || !email || !role) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'firebaseUid, name, email, and role are required')
    }

    if (role !== USER_ROLES.DRIVER && role !== USER_ROLES.COMPANY) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        `role must be "${USER_ROLES.DRIVER}" or "${USER_ROLES.COMPANY}"`
      )
    }

    // Idempotent
    const existing = await UserModel.findOne({ firebaseUid })
    if (existing) {
      return res.status(StatusCodes.OK).json(existing)
    }

    let user
    if (role === USER_ROLES.DRIVER) {
      user = await DriverModel.create({
        firebaseUid,
        name,
        email,
        certificationDocuments: certificationDocuments ?? [],
        ...(profilePictureUrl ? { profilePictureUrl } : {}),
      })
    } else {
      user = await CompanyModel.create({
        firebaseUid,
        name,
        email,
        companyName: name,
        contactName: name,
        businessDocuments: businessDocuments ?? [],
      })
    }

    return res.status(StatusCodes.CREATED).json(user)
  } catch (err) {
    next(err)
  }
}

// GET /api/users/me
// Returns the MongoDB user document for the authenticated caller.
// Identity comes from the verified token (req.firebaseUid), not a query param.
// Used by the frontend to get the mongoId and role after auth state restores.
export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const firebaseUid = req.firebaseUid

    if (!firebaseUid) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'Authentication required')
    }

    const user = await UserModel.findOne({ firebaseUid })

    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'User not found' })
    }

    return res.status(StatusCodes.OK).json(user)
  } catch (err) {
    next(err)
  }
}

// GET /api/users/:userId/feed-preferences
// Returns the user's feed preferences (blocklist-driven feed filtering)
export const getFeedPreferences = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.params.userId as string

    const user = await UserModel.findById(userId).select('feedPreferences')

    if (!user) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'User not found')
    }

    return res.status(StatusCodes.OK).json(user.feedPreferences ?? {})
  } catch (err) {
    next(err)
  }
}

// PATCH /api/users/:userId/feed-preferences
// Partially update the user's feed preferences
// Body: { hideBlocked?, hideBelowMinimum?, notifyReview? }
export const updateFeedPreferences = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.params.userId as string
    const allowedKeys = ['hideBlocked', 'hideBelowMinimum', 'notifyReview'] as const

    const updates: Record<string, boolean> = {}
    for (const key of allowedKeys) {
      if (typeof req.body[key] === 'boolean') {
        updates[`feedPreferences.${key}`] = req.body[key]
      }
    }

    if (Object.keys(updates).length === 0) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'No valid preference keys provided')
    }

    const user = await UserModel.findByIdAndUpdate(userId, { $set: updates }, { new: true }).select(
      'feedPreferences'
    )

    if (!user) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'User not found')
    }

    return res.status(StatusCodes.OK).json(user.feedPreferences ?? {})
  } catch (err) {
    next(err)
  }
}
