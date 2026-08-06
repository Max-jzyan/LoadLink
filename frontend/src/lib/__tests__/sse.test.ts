import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { withSSEToken } from '../sse'
import { auth } from '@/lib/firebase'

describe('sse.ts — withSSEToken', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    // The firebase mock in setup.ts provides auth.currentUser with getIdToken returning 'test-firebase-token'
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('appends access_token query param when user has a token', async () => {
    const result = await withSSEToken('/api/sse/bids/load-1')
    expect(result).toBe('/api/sse/bids/load-1?access_token=test-firebase-token')
  })

  it('uses & separator when path already has a query string', async () => {
    const result = await withSSEToken('/api/sse/bids/load-1?foo=bar')
    expect(result).toBe('/api/sse/bids/load-1?foo=bar&access_token=test-firebase-token')
  })

  it('URL-encodes the token', async () => {
    const fakeUser = {
      getIdToken: async () => 'token with spaces&special=chars',
    }
    ;(auth as unknown as { currentUser: unknown }).currentUser = { getIdToken: fakeUser.getIdToken }
    const result = await withSSEToken('/api/sse/price/load-1')
    expect(result).toBe('/api/sse/price/load-1?access_token=' + encodeURIComponent('token with spaces&special=chars'))
  })

  it('returns path unchanged when currentUser is null', async () => {
    ;(auth as unknown as { currentUser: unknown }).currentUser = null
    const result = await withSSEToken('/api/sse/bids/load-1')
    expect(result).toBe('/api/sse/bids/load-1')
  })

  it('returns path unchanged when getIdToken returns null/empty', async () => {
    ;(auth as unknown as { currentUser: unknown }).currentUser = {
      getIdToken: async () => '',
    }
    const result = await withSSEToken('/api/sse/bids/load-1')
    expect(result).toBe('/api/sse/bids/load-1')
  })

  it('returns path unchanged when getIdToken throws (catch block)', async () => {
    ;(auth as unknown as { currentUser: unknown }).currentUser = {
      getIdToken: async () => {
        throw new Error('Token refresh failed')
      },
    }
    const result = await withSSEToken('/api/sse/bids/load-1')
    expect(result).toBe('/api/sse/bids/load-1')
  })
})
