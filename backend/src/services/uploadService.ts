import { randomUUID } from 'crypto'
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { StatusCodes } from 'http-status-codes'
import { AWS_REGION, S3_BUCKET, s3Client } from '../config/s3Client'
import { ApiError } from '../utils/ApiError'

const DOWNLOAD_URL_EXPIRY_SECONDS = 3600

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

const S3_URL_PREFIX = `https://${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/`

/** Extracts the S3 key back out of a URL previously returned by createUploadUrl. */
export const keyFromUrl = (url: string): string | null => {
  if (!url || !url.startsWith(S3_URL_PREFIX)) return null
  return url.slice(S3_URL_PREFIX.length)
}

/**
 * Generate a short-lived presigned GET URL for an object in the (private)
 * bucket, so previously-uploaded files can actually be displayed/downloaded —
 * the bucket has no public read access, so the plain stored URL 403s on its own.
 */
export const createDownloadUrl = async (key: string): Promise<string> => {
  const command = new GetObjectCommand({ Bucket: S3_BUCKET, Key: key })
  return getSignedUrl(s3Client, command, { expiresIn: DOWNLOAD_URL_EXPIRY_SECONDS })
}

/** Replaces a stored (unsigned, 403-on-GET) S3 URL with a presigned, viewable one. */
export const toViewableUrl = async (url?: string | null): Promise<string | undefined> => {
  if (!url) return url ?? undefined
  const key = keyFromUrl(url)
  if (!key) return url
  return createDownloadUrl(key)
}

/** Deletes a previously-uploaded object given the stored URL, e.g. when it's being replaced. */
export const deleteObjectByUrl = async (url?: string | null): Promise<void> => {
  if (!url) return
  const key = keyFromUrl(url)
  if (!key) return
  await s3Client.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key }))
}
