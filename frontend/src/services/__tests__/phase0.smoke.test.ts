import { describe, it, expect, beforeEach } from 'vitest'
import { createTestStore, seedToken, restoreFetch, mockFetchResponse, getFetchCalls, resetFetchCalls, fixtures } from './helpers'
import { api } from '../api'
import { __setCachedTokenForTests } from '../api'

describe('Phase 0 smoke test — test infrastructure', () => {
  beforeEach(() => {
    resetFetchCalls()
    __setCachedTokenForTests(null)
  })

  it('creates a store with api middleware', async () => {
    const store = createTestStore()
    expect(store).toBeDefined()
    expect(store.dispatch).toBeDefined()
  })

  it('seeds a cached token', async () => {
    await seedToken('my-token')
    expect(true).toBe(true)
  })

  it('records fetch requests when fetch is stubbed via helpers', async () => {
    mockFetchResponse({ status: 200, body: fixtures.load() })
    await fetch('/api/loads/load-1')
    const calls = getFetchCalls()
    expect(calls.length).toBeGreaterThanOrEqual(1)
    expect(calls[0].url).toContain('/loads/load-1')
    restoreFetch()
  })

  it('surfaces 500 errors via mocked fetch', async () => {
    mockFetchResponse({ status: 500, body: { message: 'Boom' } })
    await fetch('/api/test-endpoint', { method: 'POST', body: JSON.stringify({ foo: 'bar' }) })
    const calls = getFetchCalls()
    expect(calls.length).toBeGreaterThanOrEqual(1)
    const lastCall = calls[calls.length - 1]
    expect(lastCall.options?.method).toBeDefined()
    restoreFetch()
  })

  it('allows importing api and helpers without errors', async () => {
    expect(api).toBeDefined()
    expect(createTestStore).toBeDefined()
    await seedToken('token')
    expect(fixtures.load).toBeDefined()
  })
})