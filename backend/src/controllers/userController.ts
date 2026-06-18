import { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import { UserModel } from '../models/users/User'
import { DriverModel } from '../models/users/Driver'
import { CompanyModel } from '../models/users/Company'
import { USER_ROLES } from '../models/enums'
import { ApiError } from '../utils/ApiError'

// POST /api/users/register
// Called right after Firebase signup to save the user role in MongoDB
// Body: { firebaseUid, name, email, role: 'driver' | 'company' }
// Creates a Driver or Company discriminator document.
// Idempotent
export const registerUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { firebaseUid, name, email, role } = req.body as {
      firebaseUid: string
      name: string
      email: string
      role: string
    }

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
      user = await DriverModel.create({ firebaseUid, name, email })
    } else {
      user = await CompanyModel.create({
        firebaseUid,
        name,
        email,
        companyName: name,
        contactName: name,
      })
    }

    return res.status(StatusCodes.CREATED).json(user)
  } catch (err) {
    next(err)
  }
}

// GET /api/users/me?firebaseUid=<uid>
// Returns the MongoDB user document for the given Firebase UID
// Used by the frontend to get the mongoId and role after auth state restores
export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { firebaseUid } = req.query as { firebaseUid: string }

    if (!firebaseUid) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'firebaseUid query param is required')
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
