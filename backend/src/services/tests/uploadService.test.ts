jest.mock('crypto', () => ({ randomUUID: () => 'fixed-uuid' }))
jest.mock('@aws-sdk/client-s3', () => ({
  PutObjectCommand: jest.fn().mockImplementation((input) => ({ input })),
  GetObjectCommand: jest.fn().mockImplementation((input) => ({ input })),
  DeleteObjectCommand: jest.fn().mockImplementation((input) => ({ input })),
}))
jest.mock('@aws-sdk/s3-request-presigner', () => ({ getSignedUrl: jest.fn() }))
jest.mock('../../config/s3Client', () => ({
  AWS_REGION: 'us-east-1',
  S3_BUCKET: 'test-bucket',
  s3Client: { send: jest.fn() },
}))

import { StatusCodes } from 'http-status-codes'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { DeleteObjectCommand } from '@aws-sdk/client-s3'
import { s3Client } from '../../config/s3Client'
import {
  createUploadUrl,
  keyFromUrl,
  createDownloadUrl,
  toViewableUrl,
  deleteObjectByUrl,
} from '../uploadService'

const getSignedUrlMock = jest.mocked(getSignedUrl)
const s3SendMock = jest.mocked(s3Client.send)

const PREFIX = 'https://test-bucket.s3.us-east-1.amazonaws.com/'

beforeEach(() => {
  jest.clearAllMocks()
})

describe('createUploadUrl', () => {
  it('400s on an invalid docType', async () => {
    await expect(
      createUploadUrl({
        ownerId: 'owner-1',
        docType: 'bogus',
        fileName: 'x.pdf',
        contentType: 'application/pdf',
      })
    ).rejects.toMatchObject({ statusCode: StatusCodes.BAD_REQUEST })
  })

  it('400s on an unsupported content type', async () => {
    await expect(
      createUploadUrl({
        ownerId: 'owner-1',
        docType: 'driverDocuments',
        fileName: 'x.exe',
        contentType: 'application/x-msdownload',
      })
    ).rejects.toMatchObject({ statusCode: StatusCodes.BAD_REQUEST })
  })

  it('sanitizes the file name and returns the upload/file urls', async () => {
    getSignedUrlMock.mockResolvedValue('https://presigned-put-url')

    const result = await createUploadUrl({
      ownerId: 'owner-1',
      docType: 'driverDocuments',
      fileName: 'my résumé (final)!.pdf',
      contentType: 'application/pdf',
    })

    expect(result.key).toBe('driverDocuments/owner-1/fixed-uuid-my_r_sum___final__.pdf')
    expect(result.uploadUrl).toBe('https://presigned-put-url')
    expect(result.fileUrl).toBe(`${PREFIX}${result.key}`)
    expect(getSignedUrlMock).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
      expiresIn: 300,
    })
  })
})

describe('keyFromUrl', () => {
  it('returns null for an empty url', () => {
    expect(keyFromUrl('')).toBeNull()
  })

  it('returns null when the url does not match the bucket prefix', () => {
    expect(keyFromUrl('https://someone-else.s3.amazonaws.com/key')).toBeNull()
  })

  it('extracts the key from a raw url', () => {
    expect(keyFromUrl(`${PREFIX}driverDocuments/owner-1/file.pdf`)).toBe(
      'driverDocuments/owner-1/file.pdf'
    )
  })

  it('strips query params from a presigned url', () => {
    expect(keyFromUrl(`${PREFIX}driverDocuments/owner-1/file.pdf?X-Amz-Signature=abc`)).toBe(
      'driverDocuments/owner-1/file.pdf'
    )
  })
})

describe('createDownloadUrl', () => {
  it('requests a 1-hour presigned GET url', async () => {
    getSignedUrlMock.mockResolvedValue('https://presigned-get-url')

    const url = await createDownloadUrl('driverDocuments/owner-1/file.pdf')

    expect(url).toBe('https://presigned-get-url')
    expect(getSignedUrlMock).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
      expiresIn: 3600,
    })
  })
})

describe('toViewableUrl', () => {
  it('passes through null/undefined as undefined', async () => {
    await expect(toViewableUrl(null)).resolves.toBeUndefined()
    await expect(toViewableUrl(undefined)).resolves.toBeUndefined()
  })

  it('returns the url unchanged when it does not match the bucket prefix', async () => {
    await expect(toViewableUrl('https://example.com/not-s3')).resolves.toBe(
      'https://example.com/not-s3'
    )
  })

  it('signs a stored bucket url into a viewable one', async () => {
    getSignedUrlMock.mockResolvedValue('https://presigned-get-url')

    await expect(toViewableUrl(`${PREFIX}driverDocuments/owner-1/file.pdf`)).resolves.toBe(
      'https://presigned-get-url'
    )
  })
})

describe('deleteObjectByUrl', () => {
  it('no-ops for a falsy url', async () => {
    await deleteObjectByUrl(null)
    await deleteObjectByUrl(undefined)

    expect(s3SendMock).not.toHaveBeenCalled()
  })

  it('no-ops when the url does not match the bucket prefix', async () => {
    await deleteObjectByUrl('https://example.com/not-s3')

    expect(s3SendMock).not.toHaveBeenCalled()
  })

  it('deletes the resolved key from the bucket', async () => {
    await deleteObjectByUrl(`${PREFIX}driverDocuments/owner-1/file.pdf`)

    expect(DeleteObjectCommand).toHaveBeenCalledWith({
      Bucket: 'test-bucket',
      Key: 'driverDocuments/owner-1/file.pdf',
    })
    expect(s3SendMock).toHaveBeenCalled()
  })
})
