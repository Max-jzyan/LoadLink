import { useCallback, useState } from 'react'

export type GeolocationStatus = 'idle' | 'locating' | 'success' | 'error'

export interface CurrentLocation {
  lat: number
  lng: number
}

export interface UseCurrentLocationResult {
  location: CurrentLocation | null
  status: GeolocationStatus
  error: string | null
  requestLocation: () => void
  clearLocation: () => void
}

function describeGeolocationError(err: GeolocationPositionError): string {
  switch (err.code) {
    case err.PERMISSION_DENIED:
      return 'Location permission denied. Enable it in your browser settings to use this feature.'
    case err.POSITION_UNAVAILABLE:
      return 'Your location could not be determined.'
    case err.TIMEOUT:
      return 'Location request timed out. Please try again.'
    default:
      return 'Could not get your current location.'
  }
}

/**
 * Wraps the browser's Geolocation API for an on-demand "use my current
 * location" action. One-shot (getCurrentPosition), not continuous tracking —
 * this app has no watchPosition/live-tracking use case.
 */
export function useCurrentLocation(): UseCurrentLocationResult {
  const [location, setLocation] = useState<CurrentLocation | null>(null)
  const [status, setStatus] = useState<GeolocationStatus>('idle')
  const [error, setError] = useState<string | null>(null)

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus('error')
      setError('Geolocation is not supported by this browser.')
      return
    }

    setStatus('locating')
    setError(null)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({ lat: position.coords.latitude, lng: position.coords.longitude })
        setStatus('success')
      },
      (err) => {
        setStatus('error')
        setError(describeGeolocationError(err))
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    )
  }, [])

  const clearLocation = useCallback(() => {
    setLocation(null)
    setStatus('idle')
    setError(null)
  }, [])

  return { location, status, error, requestLocation, clearLocation }
}