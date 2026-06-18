import { useEffect, useRef, useState } from 'react'

export type SSEStatus = 'connecting' | 'connected' | 'disconnected'

export interface UseEventSourceResult<T> {
  data: T | null
  status: SSEStatus
}

const BASE_RETRY_MS = 2_000
const MAX_RETRY_MS = 30_000
const JITTER_MS = 1_000

// Subscribe to an SSE endpoint and return the latest parsed JSON payload
export function useEventSource<T>(url: string | null): UseEventSourceResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [status, setStatus] = useState<SSEStatus>('connecting')

  // Mutable refs shared with the effect closure
  const sourceRef = useRef<EventSource | null>(null)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retryCountRef = useRef(0)

  useEffect(() => {
    // `cancelled` is flipped to true when the effect tears down
    let cancelled = false

    const clearRetry = () => {
      if (retryTimerRef.current !== null) {
        clearTimeout(retryTimerRef.current)
        retryTimerRef.current = null
      }
    }

    const closeSource = () => {
      clearRetry()
      if (sourceRef.current) {
        sourceRef.current.close()
        sourceRef.current = null
      }
    }

    // Connect
    const connect = () => {
      if (cancelled || !url) {
        return
      }
      closeSource()

      const source = new EventSource(url)
      sourceRef.current = source

      source.onopen = () => {
        if (cancelled) {
          return
        }
        retryCountRef.current = 0
        setStatus('connected')
      }

      source.onmessage = (e: MessageEvent<string>) => {
        if (cancelled) {
          return
        }
        try {
          setData(JSON.parse(e.data) as T)
          // AI Generated part to fix my issue of messages ignored
          // Guard: treat first message as "connected" if onopen didn't fire
          setStatus('connected')
        } catch {
          // Ignore malformed JSON (e.g. SSE ping comment leaking as a message)
        }
      }

      source.onerror = () => {
        if (cancelled) {
          return
        }
        source.close()
        sourceRef.current = null
        setStatus('disconnected')

        // Jittered exponential backoff
        const attempt = retryCountRef.current++
        const delay =
          Math.min(BASE_RETRY_MS * 2 ** attempt, MAX_RETRY_MS) + Math.random() * JITTER_MS

        retryTimerRef.current = setTimeout(connect, delay)
      }
    }

    if (url) {
      retryCountRef.current = 0
      connect()
    }

    return () => {
      cancelled = true
      closeSource()
    }
  }, [url])

  return { data, status }
}
