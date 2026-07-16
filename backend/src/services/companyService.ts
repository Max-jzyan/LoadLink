import { isValidObjectId, Types } from 'mongoose'
import { StatusCodes } from 'http-status-codes'
import { CompanyModel } from '../models/users/Company'
import { LoadModel } from '../models/loads/Load'
import { ApiError } from '../utils/ApiError'
import * as uploadService from './uploadService'

const assertValidId = (id: string, label: string) => {
  if (!isValidObjectId(id)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, `Invalid ${label}`)
  }
}

/**
 * Swap stored S3 URLs for short-lived presigned GET URLs before returning
 * the company document to the client.
 */
const withViewableUrls = async (
  company: Record<string, unknown>
): Promise<Record<string, unknown>> => {
  const profilePictureUrl = company.profilePictureUrl as string | undefined
  if (profilePictureUrl) {
    company.profilePictureUrl = await uploadService.toViewableUrl(profilePictureUrl)
  }

  const businessDocuments = company.businessDocuments as
    | { name: string; url: string; key: string; uploadedAt: string }[]
    | undefined
  if (businessDocuments?.length) {
    company.businessDocuments = await Promise.all(
      businessDocuments.map(async (doc) => ({
        ...doc,
        url: await uploadService.createDownloadUrl(doc.key),
      }))
    )
  }

  return company
}

/**
 * Fetch the full company profile document with user-level fields merged in,
 * including the calculated count of posted loads.
 */
export const getCompanyProfile = async (companyId: string) => {
  assertValidId(companyId, 'companyId')

  const company = await CompanyModel.findById(new Types.ObjectId(companyId)).lean()

  if (!company) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Company not found')
  }

  // Calculate the total number of loads posted by this company
  const postedLoadsCount = await LoadModel.countDocuments({ companyId: company._id })

  return withViewableUrls({
    ...company,
    postedLoadsCount,
  })
}

/**
 * Update editable fields on a company's profile.
 */
export const updateCompanyProfile = async (
  companyId: string,
  updateData: Record<string, unknown>
) => {
  assertValidId(companyId, 'companyId')

  const allowedFields = [
    'companyName',
    'contactName',
    'businessAddress',
    'businessNumber',
    'businessDocuments',
    'profilePictureUrl',
    'phone',
    'name',
    'notificationPreferences',
  ]

  const filteredData: Record<string, unknown> = {}
  for (const field of allowedFields) {
    if (updateData[field] !== undefined) {
      filteredData[field] = updateData[field]
    }
  }

  if (Object.keys(filteredData).length === 0) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'No valid fields to update')
  }

  // Clean up old S3 profile picture when replaced
  if (typeof filteredData.profilePictureUrl === 'string' && filteredData.profilePictureUrl) {
    const existing = await CompanyModel.findById(new Types.ObjectId(companyId))
      .select('profilePictureUrl')
      .lean()
    if (
      existing?.profilePictureUrl &&
      existing.profilePictureUrl !== filteredData.profilePictureUrl
    ) {
      await uploadService.deleteObjectByUrl(existing.profilePictureUrl)
    }
  }

  const company = await CompanyModel.findByIdAndUpdate(
    new Types.ObjectId(companyId),
    { $set: filteredData },
    { new: true, runValidators: true }
  ).lean()

  if (!company) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Company not found')
  }

  return withViewableUrls(company)
}