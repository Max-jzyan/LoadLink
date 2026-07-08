import { randomUUID } from 'crypto'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { StatusCodes } from 'http-status-codes'
import { AWS_REGION, S3_BUCKET, s3Client } from '../config/s3Client'
import { ApiError } from '../utils/ApiError'

const DOC_TYPES = new Set(['driverDocuments', 'companyDocuments', 'loadDocuments'])

const ALLOWED_CONTENT_TYPES = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/webp'])

const PRESIGN_EXPIRY_SECONDS = 300

/**
 * Generate a presigned S3 PutObject URL scoped by ownerId (the caller's own
 * Firebase UID for driverDocuments/companyDocuments, or the loadId for
 * loadDocuments), so the frontend can upload a file directly to S3 without
 * the file ever passing through this backend.
 */
export const createUploadUrl = async (params: {
  ownerId: string
  docType: string
  fileName: string
  contentType: string
}) => {
  const { ownerId, docType, fileName, contentType } = params

  if (!DOC_TYPES.has(docType)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid docType')
  }
  if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Unsupported file type')
  }

  const safeName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_')
  const key = `${docType}/${ownerId}/${randomUUID()}-${safeName}`

  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    ContentType: contentType,
  })

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: PRESIGN_EXPIRY_SECONDS })
  const fileUrl = `https://${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${key}`

  return { uploadUrl, key, fileUrl }
}
