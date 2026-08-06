import { configureStore } from '@reduxjs/toolkit'
import { api } from '../api'
import authReducer from '../authSlice'

// ── Re-export vitest so test files can use `vi` without importing it ─────────
export { vi } from 'vitest'

// ── Minimal store factory for isolated endpoint tests ───────────────────────
export function createTestStore(overrides?: {
  api?: ReturnType<typeof api.injectEndpoints>
}) {
  const apiSlice = overrides?.api ?? api
  const store = configureStore({
    reducer: {
      [apiSlice.reducerPath]: apiSlice.reducer,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(apiSlice.middleware),
  })
  return store
}

// ── Fetch stub ───────────────────────────────────────────────────────────────
// fetchBaseQuery creates `new Request(url, config)` and calls `fetch(request)`.
// So the mock must handle both string URLs and Request objects.
type FetchCall = {
  url: string
  method: string
  body: unknown
  headers: Record<string, string>
  options?: RequestInit
}

let _mockFetchImpl: ((input: RequestInfo | URL, options?: RequestInit) => Promise<Response>) | null = null
const fetchCalls: FetchCall[] = []

function jsonResponse(body: unknown, status = 200): Response {
  const statusText = status === 200 ? 'OK' : status === 201 ? 'Created' : 'Error'
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    headers: new Headers({ 'Content-Type': 'application/json' }),
    text: async () => JSON.stringify(body),
    json: async () => body,
    blob: async () => new Blob([JSON.stringify(body)]),
    arrayBuffer: async () => new ArrayBuffer(0),
    formData: async () => new FormData(),
    clone: () => jsonResponse(body, status),
    redirected: false,
    type: 'basic',
    url: 'http://localhost/api',
  } as unknown as Response
}

function normalizeUrl(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `http://localhost${url.startsWith('/') ? '' : '/'}${url}`
}

/** Extract a plain record of header key→value from a Headers object. */
function headersToRecord(h: Headers): Record<string, string> {
  const rec: Record<string, string> = {}
  h.forEach((v, k) => { rec[k] = v })
  return rec
}

export function mockFetchResponse(
  input:
    | { status?: number; body?: unknown }
    | ((url: string, options?: RequestInit) => { status?: number; body?: unknown })
) {
  _mockFetchImpl = async (reqInput: RequestInfo | URL, options?: RequestInit) => {
    // Normalize the input — could be a Request object (from fetchBaseQuery) or a string.
    let url: string
    let method = 'GET'
    let body: unknown = undefined
    let headers: Record<string, string> = {}
    let reqInit: RequestInit | undefined = options

    if (typeof reqInput === 'string') {
      url = reqInput
    } else if (reqInput instanceof URL) {
      url = reqInput.toString()
    } else if (reqInput instanceof Request) {
      url = reqInput.url
      method = reqInput.method
      headers = headersToRecord(reqInput.headers)
      // Read the body text if present, then try to parse as JSON.
      try {
        const text = await reqInput.text()
        body = text ? JSON.parse(text) : undefined
      } catch {
        body = undefined
      }
    } else {
      // Fallback for any other RequestInfo shape.
      url = String(reqInput)
    }

    // Also merge any options passed directly (second arg to fetch).
    if (options) {
      if (options.method) method = options.method
      if (options.body) {
        try {
          body = typeof options.body === 'string' ? JSON.parse(options.body) : options.body
        } catch {
          body = options.body
        }
      }
      if (options.headers) {
        let optHeaders: Record<string, string>
        if (options.headers instanceof Headers) {
          optHeaders = headersToRecord(options.headers)
        } else if (Array.isArray(options.headers)) {
          optHeaders = Object.fromEntries(options.headers)
        } else {
          optHeaders = options.headers as Record<string, string>
        }
        headers = { ...headers, ...optHeaders }
      }
      reqInit = options
    }

    const normalized = normalizeUrl(url)
    fetchCalls.push({ url: normalized, method, body, headers, options: reqInit })
    const resolved = typeof input === 'function' ? input(normalized, reqInit) : input
    const status = resolved.status ?? 200
    const responseBody = resolved.body ?? {}
    return Promise.resolve(jsonResponse(responseBody, status))
  }
  ;(globalThis as unknown as { fetch: typeof fetch }).fetch = _mockFetchImpl
  return fetchCalls
}

export function resetFetchCalls() {
  fetchCalls.length = 0
}

export function getFetchCalls(): FetchCall[] {
  return fetchCalls
}

export function restoreFetch() {
  ;(globalThis as unknown as { fetch: typeof fetch }).fetch = fetch
  _mockFetchImpl = null
  fetchCalls.length = 0
}

// ── Token seeding ────────────────────────────────────────────────────────────
// api.ts stores a module-level `cachedToken` populated by `onIdTokenChanged`.
// We expose a tiny helper via dynamic import to flip it for header assertions.
export async function seedToken(token = 'test-firebase-token') {
  const mod = await import('../api')
  const anyMod = mod as unknown as { __setCachedTokenForTests?: (t: string | null) => void }
  anyMod.__setCachedTokenForTests?.(token)
}

// ── Store with auth reducer (for ban-handling tests) ──────────────────────────
export function createTestStoreWithAuth() {
  return configureStore({
    reducer: {
      [api.reducerPath]: api.reducer,
      auth: authReducer,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(api.middleware),
  })
}

// ── Fixtures (minimal shapes matching backend DTOs) ──────────────────────────
export const fixtures = {
  load: (overrides?: Record<string, unknown>) =>
    ({
      _id: 'load-1',
      companyId: 'company-1',
      status: 'auction_live',
      origin: { city: 'Calgary', province: 'AB', lat: 51.0447, lng: -114.0719 },
      destination: { city: 'Vancouver', province: 'BC', lat: 49.2827, lng: -123.1207 },
      cargo: 'Freight',
      price: 1500,
      currentPrice: 1200,
      maxPriceCap: 2000,
      distance: 970,
      weight: 10000,
      ...overrides,
    } as Record<string, unknown>),

  bid: (overrides?: Record<string, unknown>) =>
    ({
      _id: 'bid-1',
      loadId: 'load-1',
      driverId: 'driver-1',
      amount: 1200,
      status: 'pending',
      ...overrides,
    } as Record<string, unknown>),

  driverProfile: (overrides?: Record<string, unknown>) =>
    ({
      _id: 'driver-1',
      userId: 'user-1',
      name: 'Test Driver',
      phone: '555-0100',
      ...overrides,
    } as Record<string, unknown>),

  companyProfile: (overrides?: Record<string, unknown>) =>
    ({
      _id: 'company-1',
      userId: 'user-2',
      name: 'Test Company',
      ...overrides,
    } as Record<string, unknown>),

  truck: (overrides?: Record<string, unknown>) =>
    ({
      _id: 'truck-1',
      driverId: 'driver-1',
      type: 'Dry Van',
      ...overrides,
    } as Record<string, unknown>),

  trailer: (overrides?: Record<string, unknown>) =>
    ({
      _id: 'trailer-1',
      driverId: 'driver-1',
      type: 'Dry Van',
      ...overrides,
    } as Record<string, unknown>),

  review: (overrides?: Record<string, unknown>) =>
    ({
      _id: 'review-1',
      targetId: 'driver-1',
      reviewerId: 'company-1',
      loadId: 'load-1',
      rating: 5,
      comment: 'Great',
      ...overrides,
    } as Record<string, unknown>),

  report: (overrides?: Record<string, unknown>) =>
    ({
      _id: 'report-1',
      reporterId: 'driver-1',
      targetId: 'company-1',
      type: 'fraud',
      status: 'open',
      ...overrides,
    } as Record<string, unknown>),

  notification: (overrides?: Record<string, unknown>) =>
    ({
      _id: 'notif-1',
      userId: 'driver-1',
      type: 'bid_accepted',
      read: false,
      ...overrides,
    } as Record<string, unknown>),

  message: (overrides?: Record<string, unknown>) =>
    ({
      _id: 'msg-1',
      loadId: 'load-1',
      senderId: 'company-1',
      recipientId: 'driver-1',
      body: 'Hello',
      ...overrides,
    } as Record<string, unknown>),

  blocklistEntry: (overrides?: Record<string, unknown>) =>
    ({
      _id: 'bl-1',
      userId: 'driver-1',
      targetId: 'company-1',
      ...overrides,
    } as Record<string, unknown>),

  adminStats: (overrides?: Record<string, unknown>) =>
    ({
      totalUsers: 10,
      totalDrivers: 5,
      totalCompanies: 3,
      totalLoads: 20,
      ...overrides,
    } as Record<string, unknown>),
}