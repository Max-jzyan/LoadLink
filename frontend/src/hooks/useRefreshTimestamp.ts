import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * Encapsulates the manual-refresh timestamp tracking + 30s tick pattern
 * used by both DriverLoadsPage and CompanyDashboardPage.
 *
 * - On initial data load (via `fulfilledTimeStamp`), captures that as the "last manual refresh"
 * - When the user manually triggers a refresh, updates the timestamp
 * - A 30s interval tick forces re-renders so relative-time labels stay fresh
 *
 * Returns:
 *  - `lastManualRefresh`: timestamp (ms) for `relativeTime()`
 *  - `handleRefresh(refetch)`: call from the refresh button
 *  - `captureInitialLoad(fulfilledTimeStamp)`: call when RTK Query first returns data
 */
export function useRefreshTimestamp() {
  const [lastManualRefresh, setLastManualRefresh] = useState<number | null>(null)
  const capturedInitialLoad = useRef(false)

  // tick every 30s so the relative timestamp re-renders without a full refetch
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000)
    return () => clearInterval(id)
  }, [])

  const captureInitialLoad = useCallback((fulfilledTimeStamp?: number) => {
    if (fulfilledTimeStamp && !capturedInitialLoad.current) {
      capturedInitialLoad.current = true
      setLastManualRefresh(fulfilledTimeStamp)
    }
  }, [])

  const handleRefresh = useCallback((refetch: () => void) => {
    refetch()
    setLastManualRefresh(Date.now())
  }, [])

  return { lastManualRefresh, handleRefresh, captureInitialLoad }
}
