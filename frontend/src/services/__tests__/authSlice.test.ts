import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  restoreFetch,
  mockFetchResponse,
  getFetchCalls,
  resetFetchCalls,
} from './helpers'
import { __setCachedTokenForTests } from '../api'

// ── Mock firebase/auth functions used by authSlice (installed before import) ──
vi.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
  onIdTokenChanged: vi.fn(),
}))

// ── Mock @/lib/uploadDocuments so registerAndFetchUser never hits real S3 ────
vi.mock('@/lib/uploadDocuments', () => ({
  uploadDocuments: vi.fn(),
}))

import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { uploadDocuments } from '@/lib/uploadDocuments'
import { auth } from '@/lib/firebase'

// Import the module AFTER the mocks are installed so the firebase imports resolve.
import { fetchDbUser, loginAndFetchUser, registerAndFetchUser, logoutUser, BannedError } from '../authSlice'

function lastCall() {
  const calls = getFetchCalls()
  return calls[calls.length - 1]
}

describe('authSlice raw fetch & auth flows', () => {
  beforeEach(() => {
    resetFetchCalls()
    __setCachedTokenForTests(null)
    vi.mocked(createUserWithEmailAndPassword).mockReset()
    vi.mocked(signInWithEmailAndPassword).mockReset()
    vi.mocked(signOut).mockReset()
    vi.mocked(uploadDocuments).mockReset()
    // Default: auth.currentUser resolves to a token.
    ;(auth.currentUser as unknown as { getIdToken: () => Promise<string> }).getIdToken = async () => 'fb-test-token'
  })

  afterEach(() => {
    restoreFetch()
  })

  describe('fetchDbUser', () => {
    it('GET /api/users/me success returns { _id, role }', async () => {
      mockFetchResponse({ status: 200, body: { _id: 'user-1', role: 'driver' } })
      const result = await fetchDbUser()
      expect(result).toEqual({ _id: 'user-1', role: 'driver' })
      expect(lastCall().url).toContain('/api/users/me')
      expect(lastCall().method).toBe('GET')
    })

    it('sends Authorization Bearer token from currentUser.getIdToken', async () => {
      mockFetchResponse({ status: 200, body: { _id: 'user-1', role: 'driver' } })
      await fetchDbUser()
      // Raw fetch in authSlice uses a plain object header key 'Authorization'
      // (not lowercased like Headers instances from RTK Query).
      expect(lastCall().headers['Authorization']).toBe('Bearer fb-test-token')
    })

    it('returns null when no token can be obtained', async () => {
      ;(auth.currentUser as unknown as { getIdToken: () => Promise<undefined> }).getIdToken = async () => undefined
      const result = await fetchDbUser()
      expect(result).toBeNull()
    })

    it('throws BannedError on 403 + ACCOUNT_BANNED with message', async () => {
      mockFetchResponse({ status: 403, body: { code: 'ACCOUNT_BANNED', message: 'Suspended for fraud' } })
      await expect(fetchDbUser()).rejects.toThrow(BannedError)
      await expect(fetchDbUser()).rejects.toThrow('Suspended for fraud')
    })

    it('returns null on 403 without ACCOUNT_BANNED code', async () => {
      mockFetchResponse({ status: 403, body: { message: 'Forbidden' } })
      const result = await fetchDbUser()
      expect(result).toBeNull()
    })

    it('returns null on network error', async () => {
      // Simulate fetch rejection
      ;(globalThis as unknown as { fetch: typeof fetch }).fetch = async () => {
        throw new Error('Network down')
      }
      const result = await fetchDbUser()
      expect(result).toBeNull()
    })
  })

  describe('registerAndFetchUser', () => {
    it('POST /api/users/register with correct payload and returns AuthUser', async () => {
      vi.mocked(createUserWithEmailAndPassword).mockResolvedValue({
        user: { uid: 'fb-uid-1', email: 'new@test.com', getIdToken: async () => 'reg-token' },
      } as never)
      vi.mocked(uploadDocuments).mockResolvedValue([])
      mockFetchResponse({ status: 201, body: { _id: 'user-9', role: 'driver' } })

      const result = await registerAndFetchUser('new@test.com', 'password123', 'New Driver', 'driver')

      expect(result).toEqual({
        uid: 'fb-uid-1',
        email: 'new@test.com',
        mongoId: 'user-9',
        role: 'driver',
      })
      expect(lastCall().url).toContain('/api/users/register')
      expect(lastCall().method).toBe('POST')
      expect(lastCall().body).toEqual({
        name: 'New Driver',
        email: 'new@test.com',
        role: 'driver',
        certificationDocuments: [],
      })
    })

    it('includes businessDocuments for company role', async () => {
      vi.mocked(createUserWithEmailAndPassword).mockResolvedValue({
        user: { uid: 'fb-uid-2', email: 'co@test.com', getIdToken: async () => 'co-token' },
      } as never)
      vi.mocked(uploadDocuments).mockResolvedValue([])
      mockFetchResponse({ status: 201, body: { _id: 'user-10', role: 'company' } })

      await registerAndFetchUser('co@test.com', 'password123', 'New Co', 'company')

      expect(lastCall().body).toEqual({
        name: 'New Co',
        email: 'co@test.com',
        role: 'company',
        businessDocuments: [],
      })
    })

    it('signs out and throws when register returns non-ok', async () => {
      vi.mocked(createUserWithEmailAndPassword).mockResolvedValue({
        user: { uid: 'fb-uid-1', email: 'new@test.com', getIdToken: async () => 'reg-token' },
      } as never)
      vi.mocked(uploadDocuments).mockResolvedValue([])
      mockFetchResponse({ status: 400, body: { message: 'Email already in use' } })

      await expect(registerAndFetchUser('new@test.com', 'password123', 'New', 'driver')).rejects.toThrow()
      expect(signOut).toHaveBeenCalled()
    })
  })

  describe('loginAndFetchUser', () => {
    it('signs in, fetches DB user, and returns AuthUser', async () => {
      vi.mocked(signInWithEmailAndPassword).mockResolvedValue({
        user: { uid: 'fb-uid-1', email: 'existing@test.com', getIdToken: async () => 'login-token' },
      } as never)
      mockFetchResponse({ status: 200, body: { _id: 'user-1', role: 'driver' } })

      const result = await loginAndFetchUser('existing@test.com', 'password123')

      expect(result).toEqual({
        uid: 'fb-uid-1',
        email: 'existing@test.com',
        mongoId: 'user-1',
        role: 'driver',
      })
      expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
        auth,
        'existing@test.com',
        'password123'
      )
    })

    it('signs out and throws suspension error when account is banned', async () => {
      vi.mocked(signInWithEmailAndPassword).mockResolvedValue({
        user: { uid: 'fb-uid-1', email: 'banned@test.com', getIdToken: async () => 'banned-token' },
      } as never)
      mockFetchResponse({ status: 403, body: { code: 'ACCOUNT_BANNED', message: 'Suspended' } })

      await expect(loginAndFetchUser('banned@test.com', 'password123')).rejects.toThrow(
        'Your account has been suspended. Please contact support.'
      )
      expect(signOut).toHaveBeenCalled()
    })

    it('shows generic error and rethrows on invalid credentials', async () => {
      vi.mocked(signInWithEmailAndPassword).mockRejectedValue(new Error('auth/wrong-password'))
      await expect(loginAndFetchUser('bad@test.com', 'wrong')).rejects.toThrow()
    })
  })

  describe('logoutUser', () => {
    it('calls signOut(auth)', async () => {
      vi.mocked(signOut).mockResolvedValue(undefined as never)
      await logoutUser()
      expect(signOut).toHaveBeenCalledWith(auth)
    })
  })
})