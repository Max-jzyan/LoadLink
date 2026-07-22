import type { LatLngBoundsExpression, LatLngExpression } from 'leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useRef, useState } from 'react'
import { Circle, MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet'
import { LOAD_STATUSES } from '@/types/enums'
import { MAX_FUZZ_RADIUS_METERS } from '@/lib/geoFuzz'
import { resolveRoutePath } from '@/lib/routePath'

// Fix default Leaflet icon issue with bundlers
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Watches the `dark` class on <html> and returns a bool
function useDarkMode(): boolean {
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'))

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'))
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })
    return () => observer.disconnect()
  }, [])

  return isDark
}

const TILES = {
  light: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  // radnom map I found that matches, can change
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
} as const

/** A small factory that creates a coloured circle divIcon */
function createColoredIcon(color: string) {
  return L.divIcon({
    className: '',
    html: `<div style="width:16px;height:16px;background:${color};border:2px solid #fff;border-radius:50%;box-shadow:0 1px 3px rgba(0,0,0,0.4);"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  })
}

const originIcon = createColoredIcon('#22c55e') // green
const destinationIcon = createColoredIcon('#ef4444') // red
const checkInIcon = createColoredIcon('var(--primary)')

/** Formats an ISO timestamp as a short relative "Xm ago" / "Xh ago" string. */
function relativeTimeFromNow(iso: string): string {
  const diffMin = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  return `${Math.round(diffMin / 60)}h ago`
}

export type RouteCoordinate = {
  id: string
  origin: LatLngExpression
  originName: string
  destination: LatLngExpression
  destinationName: string
  status: string
  // Google encoded polyline from the backend route field -> renders as road path when present
  polyline?: string
  // Prefetched road coordinates [lat, lng][] — takes priority over polyline
  positions?: [number, number][]
}

export type CheckInPoint = {
  position: [number, number]
  checkedInAt: string
}

type DriverMapProps = {
  routes: RouteCoordinate[]
  height?: string
  selectedRouteId?: string | null
  /** Called when a route line / marker is clicked on the map */
  onRouteClick?: (routeId: string) => void
  /** Driver's most recent (fuzzed) check-in ping, if any */
  checkIn?: CheckInPoint | null
  /** Optional driver live location [lat, lng] to fly to and pin on the map */
  driverLocation?: { lat: number; lng: number } | null
  /** Max deadhead radius in meters to display around the driver location */
  driverDeadheadRadiusMeters?: number | null
}

export function DriverMap({
  routes,
  height = '500px',
  selectedRouteId,
  onRouteClick,
  checkIn,
  driverLocation,
  driverDeadheadRadiusMeters,
}: DriverMapProps) {
  const isDark = useDarkMode()
  const tile = isDark ? TILES.dark : TILES.light

  return (
    <div style={{ height }}>
      <MapContainer
        center={[54.0, -96.0]} // centred on Canada because I like details
        zoom={4}
        style={{ height: '100%', width: '100%' }}
      >
        {/* key forces remount when tile variant changes */}
        <TileLayer
          key={isDark ? 'dark' : 'light'}
          url={tile.url}
          attribution={tile.attribution}
          maxZoom={19}
        />

        <FitBoundsToRoutes routes={routes} selectedRouteId={selectedRouteId} />
        <FlyToRoute routes={routes} selectedRouteId={selectedRouteId} />
        {driverLocation && (
          <FlyToLocation location={driverLocation} radiusMeters={driverDeadheadRadiusMeters ?? undefined} />
        )}
        <ResetMapOnLocationClear routes={routes} driverLocation={driverLocation} />

        {routes.map((route) => (
          <RouteLine key={route.id} route={route} onRouteClick={onRouteClick} />
        ))}

        {checkIn && <CheckInMarker checkIn={checkIn} />}
        {driverLocation && (
          <Marker position={[driverLocation.lat, driverLocation.lng]} icon={checkInIcon}>
            <Popup>
              <strong>Your location</strong>
              <br />
              {driverLocation.lat.toFixed(5)}, {driverLocation.lng.toFixed(5)}
            </Popup>
          </Marker>
        )}
        {driverLocation && driverDeadheadRadiusMeters != null && driverDeadheadRadiusMeters > 0 && (
          <Circle
            className="deadhead-circle"
            center={[driverLocation.lat, driverLocation.lng]}
            radius={driverDeadheadRadiusMeters}
          />
        )}
      </MapContainer>
    </div>
  )
}

/**
 * Renders a driver's check-in ping as a marker plus a circle of radius
 * MAX_FUZZ_RADIUS_METERS, making clear to both parties that the pin marks an
 * approximate area rather than an exact spot.
 */
function CheckInMarker({ checkIn }: { checkIn: CheckInPoint }) {
  return (
    <>
      <Marker position={checkIn.position} icon={checkInIcon}>
        <Popup>
          <strong>Driver check-in</strong>
          <br />
          Checked in {relativeTimeFromNow(checkIn.checkedInAt)}
          <br />
          <span style={{ fontSize: '0.85em', color: '#6b7280' }}>Location is approximate</span>
        </Popup>
      </Marker>
      <Circle
        center={checkIn.position}
        radius={MAX_FUZZ_RADIUS_METERS}
        pathOptions={{ color: '#9ca3af', fillColor: '#9ca3af', fillOpacity: 0.08, weight: 1 }}
      />
    </>
  )
}

/**
 * Fits the map bounds to encompass all routes under two conditions:
 *  1. On initial mount when routes first become available.
 *  2. When selectedRouteId transitions from a value → null (reset).
 *
 * While a route is selected, this component does nothing — FlyToRoute handles focusing.
 */
function FitBoundsToRoutes({
  routes,
  selectedRouteId,
}: {
  routes: RouteCoordinate[]
  selectedRouteId?: string | null
}) {
  const map = useMap()
  const hasInitialFitRef = useRef(false)

  useEffect(() => {
    if (routes.length === 0) return

    const doFit = () => {
      const bounds = L.latLngBounds([])
      for (const route of routes) {
        bounds.extend(route.origin)
        bounds.extend(route.destination)
      }
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50] })
      }
    }

    // Initial fit: first time routes become non-empty
    if (!hasInitialFitRef.current) {
      hasInitialFitRef.current = true
      doFit()
      return
    }
  }, [map, routes])

  // Reset handler: when selectedRouteId goes from truthy → null, refit to all routes
  const prevSelectedRef = useRef(selectedRouteId)
  useEffect(() => {
    if (!prevSelectedRef.current && selectedRouteId) {
      // transitioning from null → value: skip, FlyToRoute handles this
    } else if (prevSelectedRef.current && !selectedRouteId) {
      // transitioning from value → null: reset view to all routes
      if (routes.length === 0) return
      const bounds = L.latLngBounds([])
      for (const route of routes) {
        bounds.extend(route.origin)
        bounds.extend(route.destination)
      }
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50] })
      }
    }
    prevSelectedRef.current = selectedRouteId
  }, [map, routes, selectedRouteId])

  return null
}

/** Zooms the map to a route when selectedRouteId changes */
function FlyToRoute({
  routes,
  selectedRouteId,
}: {
  routes: RouteCoordinate[]
  selectedRouteId?: string | null
}) {
  const map = useMap()

  useEffect(() => {
    if (!selectedRouteId) return

    const route = routes.find((r) => r.id === selectedRouteId)
    if (!route) return

    // Build bounds from actual road positions/polyline if available,
    // otherwise fall back to origin→destination straight line.
    const tempBounds = L.latLngBounds([])

    const positions: LatLngExpression[] = resolveRoutePath(route)

    for (const pos of positions) {
      tempBounds.extend(pos)
    }

    if (tempBounds.isValid()) {
      map.fitBounds(tempBounds, { padding: [40, 40] })
    }
  }, [map, routes, selectedRouteId])

  return null
}

const HISTORICAL_STATUSES = new Set<string>(['completed', 'cancelled', 'auction_closed'])

function getRouteColor(status: string): string {
  if (status === 'auction_live') return '#f97316' // orange
  if (HISTORICAL_STATUSES.has(status)) return '#6b7280' // grey
  return '#3b82f6' // blue (all others)
}

function isRouteDashed(status: string): boolean {
  return status === LOAD_STATUSES.Booked
}

/** Zooms the map to include the driver's full deadhead circle once when it first becomes available */
function FlyToLocation({
  location,
  radiusMeters,
}: {
  location: { lat: number; lng: number }
  radiusMeters?: number
}) {
  const map = useMap()
  const hasFlownRef = useRef(false)

  useEffect(() => {
    if (hasFlownRef.current) return
    hasFlownRef.current = true

    if (typeof radiusMeters === 'number' && radiusMeters > 0) {
      const metersPerDegLat = 110_574
      const latRad = (location.lat * Math.PI) / 180
      const metersPerDegLng = 111_320 * Math.cos(latRad)

      const dLat = radiusMeters / metersPerDegLat
      const dLng = radiusMeters / metersPerDegLng

      const southWest: [number, number] = [location.lat - dLat, location.lng - dLng]
      const northEast: [number, number] = [location.lat + dLat, location.lng + dLng]

      const bounds = L.latLngBounds(southWest, northEast)
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 })
      }
    } else {
      map.flyTo([location.lat, location.lng], 14, { duration: 1.5 })
    }
  }, [map, location.lat, location.lng, radiusMeters])

  return null
}

/** Resets the map view back to all routes after location is cleared */
function ResetMapOnLocationClear({
  routes,
  driverLocation,
}: {
  routes: RouteCoordinate[]
  driverLocation?: { lat: number; lng: number } | null
}) {
  const map = useMap()
  const prevLocationRef = useRef(driverLocation)

  useEffect(() => {
    const prevLocation = prevLocationRef.current
    if (prevLocation && !driverLocation) {
      // transitioning from set → cleared
      if (routes.length === 0) return
      const bounds = L.latLngBounds([])
      for (const route of routes) {
        bounds.extend(route.origin)
        bounds.extend(route.destination)
      }
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50] })
      }
    }
    prevLocationRef.current = driverLocation
  }, [map, routes, driverLocation])

  return null
}

function RouteLine({
  route,
  onRouteClick,
}: {
  route: RouteCoordinate
  onRouteClick?: (routeId: string) => void
}) {
  const map = useMap()
  const polylineRef = useRef<L.Polyline>(null)

  const positions: LatLngExpression[] = resolveRoutePath(route)

  const isRoad = !!(route.positions || route.polyline)

  const handleClick = () => {
    const line = polylineRef.current
    if (!line) return
    const bounds = line.getBounds() as LatLngBoundsExpression
    map.fitBounds(bounds, { padding: [40, 40] })
    onRouteClick?.(route.id)
  }

  const color = getRouteColor(route.status)

  return (
    <>
      <Marker position={route.origin} icon={originIcon}>
        <Popup>
          <strong>Origin</strong>
          <br />
          {route.originName}
        </Popup>
      </Marker>
      <Marker position={route.destination} icon={destinationIcon}>
        <Popup>
          <strong>Destination</strong>
          <br />
          {route.destinationName}
        </Popup>
      </Marker>
      <Polyline
        ref={polylineRef}
        positions={positions}
        pathOptions={{
          color,
          weight: isRoad ? 4 : 2,
          opacity: 0.8,
          dashArray: isRouteDashed(route.status) ? '10, 10' : undefined,
        }}
        eventHandlers={{ click: handleClick }}
      />
    </>
  )
}
