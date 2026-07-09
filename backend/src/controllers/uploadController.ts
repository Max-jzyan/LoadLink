import { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import { isValidObjectId } from 'mongoose'
import * as uploadService from '../services/uploadService'
import { LoadModel } from '../models/loads/Load'
import { CompanyModel } from '../models/users/Company'
import { DriverModel } from '../models/users/Driver'
import { USER_ROLES } from '../models/enums'
import { ApiError } from '../utils/ApiError'

/**
 * POST /api/uploads/presign
 * Body: { docType: 'driverDocuments' | 'companyDocuments' | 'loadDocuments', fileName, contentType, firebaseUid?, loadId? }
 * Returns a presigned S3 URL the client can PUT the file to directly. Profile
 * pictures are uploaded here too, sharing the driverDocuments/companyDocuments
 * folder rather than getting a dedicated docType.
 * driverDocuments/companyDocuments are linked to the caller's own firebaseUid.
 * loadDocuments are linked to loadId instead (requires the caller to be the
 * posting company or assigned driver on that load).
 */
export const createUploadUrl = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { docType, fileName, contentType, loadId } = req.body as {
      docType: string
      fileName: string
      contentType: string
      loadId?: string
    }

    const firebaseUid = req.firebaseUid!

    if (!docType || !fileName || !contentType) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'docType, fileName, and contentType are required')
    }

    let ownerId = firebaseUid

    if (docType === 'loadDocuments') {
      if (!loadId || !isValidObjectId(loadId)) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'A valid loadId is required for loadDocuments')
      }

      const load = await LoadModel.findById(loadId).select('companyId assignedDriverId')
      if (!load) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Load not found')
      }

      const [company, driver] = await Promise.all([
        CompanyModel.findOne({ firebaseUid, _id: load.companyId }).select('_id'),
        load.assignedDriverId
          ? DriverModel.findOne({ firebaseUid, _id: load.assignedDriverId }).select('_id')
          : null,
      ])
      if (!company && !driver) {
        throw new ApiError(StatusCodes.FORBIDDEN, 'Access denied')
      }

      ownerId = loadId
    }

    const result = await uploadService.createUploadUrl({
      ownerId,
      docType,
      fileName,
      contentType,
    })

    res.status(StatusCodes.OK).json(result)
  } catch (err) {
    next(err)
  }
}
