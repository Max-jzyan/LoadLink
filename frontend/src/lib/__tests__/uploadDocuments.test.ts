import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { uploadDocuments } from '../uploadDocuments'
import { resetFetchCalls, getFetchCalls, mockFetchResponse, restoreFetch } from '@/services/__tests__/helpers'

// We need to mock fetch — reuse the helpers infrastructure but manage it ourselves
// since helpers exports a fetch mock.
import { mockFetchResponse as _mock, getFetchCalls as _calls, resetFetchCalls as _reset, restoreFetch as _restore } from '@/services/__tests__/helpers'

describe('uploadDocuments', () => {
  beforeEach(() => {
    _reset()
  })

  afterEach(() => {
    _restore()
  })

  function makeFile(name: string, type = 'application/octet-stream', content = 'data'): File {
    return new File([content], name, { type })
  }

  describe('getPresignedUrl error path', () => {
    it('throws when presigned URL request fails (non-ok response)', async () => {
      // Return 500 for the presign POST
      _mock({ status: 500, body: { message: 'Server error' } })
      const file = makeFile('doc.pdf')
      await expect(
        uploadDocuments('token', 'uid-1', 'driverDocuments', [file])
      ).rejects.toThrow('Failed to prepare upload for "doc.pdf"')
    })

    it('throws when presigned URL request returns 400', async () => {
      _mock({ status: 400, body: { message: 'Bad request' } })
      const file = makeFile('license.png')
      await expect(
        uploadDocuments('token', 'uid-1', 'companyDocuments', [file])
      ).rejects.toThrow('Failed to prepare upload for "license.png"')
    })
  })

  describe('PUT upload error path', () => {
    it('throws when S3 PUT upload returns non-ok', async () => {
      // First call (presign) succeeds, second call (PUT to uploadUrl) fails.
      // We use a function-based mock to differentiate.
      let callCount = 0
      _mock((_url: string) => {
        callCount++
        if (callCount === 1) {
          // presigned URL response
          return {
            status: 200,
            body: {
              uploadUrl: 'https://s3.amazonaws.com/bucket/key',
              key: 'some-key',
              fileUrl: 'https://s3.amazonaws.com/bucket/file.pdf',
            },
          }
        }
        // PUT to S3 fails
        return { status: 500, body: {} }
      })

      const file = makeFile('doc.pdf')
      await expect(
        uploadDocuments('token', 'uid-1', 'driverDocuments', [file])
      ).rejects.toThrow('Failed to upload "doc.pdf"')
    })
  })

  describe('success path (for completeness)', () => {
    it('uploads files and returns UploadedDocument[] with correct fields', async () => {
      let callCount = 0
      _mock((_url: string) => {
        callCount++
        if (callCount === 1) {
          return {
            status: 200,
            body: {
              uploadUrl: 'https://s3.amazonaws.com/bucket/key',
              key: 'trailer-key-1',
              fileUrl: 'https://s3.amazonaws.com/bucket/uploaded.pdf',
            },
          }
        }
        return { status: 200, body: {} }
      })

      const file = makeFile('doc.pdf', 'application/pdf')
      const result = await uploadDocuments('my-token', 'firebase-uid', 'loadDocuments', [file], 'load-42')
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('doc.pdf')
      expect(result[0].url).toBe('https://s3.amazonaws.com/bucket/uploaded.pdf')
      expect(result[0].key).toBe('trailer-key-1')
    })

    it('uploads multiple files and returns all', async () => {
      let callCount = 0
      _mock((_url: string) => {
        callCount++
        if (callCount === 1) {
          return {
            status: 200,
            body: { uploadUrl: 'https://s3/u1', key: 'k1', fileUrl: 'https://s3/f1' },
          }
        }
        if (callCount === 2) {
          // PUT for file 1
          return { status: 200, body: {} }
        }
        if (callCount === 3) {
          return {
            status: 200,
            body: { uploadUrl: 'https://s3/u2', key: 'k2', fileUrl: 'https://s3/f2' },
          }
        }
        // PUT for file 2
        return { status: 200, body: {} }
      })

      const files = [makeFile('a.pdf'), makeFile('b.pdf')]
      const result = await uploadDocuments('token', 'uid', 'driverDocuments', files)
      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('a.pdf')
      expect(result[1].name).toBe('b.pdf')
    })
  })
})
