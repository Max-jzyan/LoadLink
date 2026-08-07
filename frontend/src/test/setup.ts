import { vi } from 'vitest'

// ── Firebase auth mock (installed before api.ts imports it) ──────────────────
vi.mock('@/lib/firebase', () => {
  const user = {
    getIdToken: async () => 'test-firebase-token',
    getIdTokenResult: async () => ({ expirationTime: new Date(Date.now() + 3600_000).toISOString() }),
    uid: 'test-uid',
    email: 'test@example.com',
  }
  const auth = {
    currentUser: user,
    onIdTokenChanged: (_a: unknown, nextOrObserver: unknown) => {
      const cb = typeof nextOrObserver === 'function'
        ? nextOrObserver
        : (nextOrObserver as { next?: (u: unknown) => void })?.next
      if (typeof cb === 'function') {
        cb(user)
      }
      return () => {}
    },
  }
  return { auth }
})

// ── Toast mocks ──────────────────────────────────────────────────────────────
vi.mock('@/lib/toast', () => ({
  showSuccess: vi.fn(),
  showError: vi.fn(),
  getSuccessMessage: vi.fn((action: string, noun: string) => `${action} ${noun} success`),
  getHttpErrorMessage: vi.fn((_status?: number, fallback = 'Request failed') => fallback),
  getErrorStatus: vi.fn((err: unknown) => (err && typeof err === 'object' && 'status' in err ? (err as { status: number }).status : 500)),
}))

// ── Global EventSource stub ──────────────────────────────────────────────────
const mockEventSources: Array<{
  url: string
  readyState: number
  onopen: ((event: Event) => void) | null
  onmessage: ((event: MessageEvent) => void) | null
  onerror: ((event: Event) => void) | null
  close: () => void
  emit: (data: unknown) => void
}> = []

const originalEventSource = globalThis.EventSource

;(globalThis as unknown as { EventSource: typeof EventSource }).EventSource = class {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSED = 2
  url: string
  readyState: number = EventSource.OPEN
  onopen: ((event: Event) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null

  constructor(url: string) {
    this.url = url
    mockEventSources.push(this)
    setTimeout(() => this.onopen?.({ type: 'open', target: this } as unknown as Event), 0)
  }

  close() {
    this.readyState = EventSource.CLOSED
  }

  emit(data: unknown) {
    this.onmessage?.({ type: 'message', data: JSON.stringify(data), target: this } as unknown as MessageEvent)
  }
} as unknown as typeof EventSource

export function resetMockEventSources() {
  mockEventSources.length = 0
}
export function getMockEventSources() {
  return mockEventSources
}
export function restoreEventSource() {
  ;(globalThis as unknown as { EventSource: typeof EventSource }).EventSource = originalEventSource
}

// ── JSDOM gaps ───────────────────────────────────────────────────────────────
if (typeof window.matchMedia === 'undefined') {
  const matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })
  ;(window as unknown as { matchMedia: typeof matchMedia }).matchMedia = matchMedia
}

;(globalThis as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver

// ── Patch Request to accept relative URLs (fetchBaseQuery does `new Request(url)`) ─
const OriginalRequest = globalThis.Request
;(globalThis as unknown as { Request: typeof OriginalRequest }).Request = class Request extends OriginalRequest {
  constructor(input: RequestInfo | URL, init?: RequestInit) {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    const normalized = url.startsWith('http://') || url.startsWith('https://') ? url : `http://localhost${url.startsWith('/') ? '' : '/'}${url}`
    super(normalized, init)
  }
} as unknown as typeof OriginalRequest

;(globalThis as unknown as { IntersectionObserver: typeof IntersectionObserver }).IntersectionObserver = class {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] { return [] }
  root = null
  rootMargin = ''
  thresholds: ReadonlyArray<number> = []
} as unknown as typeof IntersectionObserver