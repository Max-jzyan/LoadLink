import type { LatLngBoundsExpression, LatLngExpression } from 'leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useRef, useState } from 'react'
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet'

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

export type RouteCoordinate = {
  id: string
  origin: LatLngExpression
  originName: string
  destination: LatLngExpression
  destinationName: string
  status: string
}

type DriverMapProps = {
  routes: RouteCoordinate[]
  height?: string
  selectedRouteId?: string | null
}

// This is mostly just a test
export function DriverMap({ routes, height = '500px', selectedRouteId }: DriverMapProps) {
  const isDark = useDarkMode()
  const tile = isDark ? TILES.dark : TILES.light

  return (
    <div style={{ height }}>
      <MapContainer
        center={[49.2827, -123.1207]}
        zoom={5}
        style={{ height: '100%', width: '100%' }}
      >
        {/* key forces remount when tile variant changes */}
        <TileLayer
          key={isDark ? 'dark' : 'light'}
          url={tile.url}
          attribution={tile.attribution}
          maxZoom={19}
        />

        <FlyToRoute routes={routes} selectedRouteId={selectedRouteId} />

        {routes.map((route, idx) => (
          <RouteLine key={idx} route={route} />
        ))}
      </MapContainer>
    </div>
  )
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

    // Create a temporary polyline just to compute bounds
    const tempBounds = L.latLngBounds([route.origin, route.destination])
    map.fitBounds(tempBounds, { padding: [40, 40] })
  }, [map, routes, selectedRouteId])

  return null
}

function RouteLine({ route }: { route: RouteCoordinate }) {
  const map = useMap()
  const polylineRef = useRef<L.Polyline>(null)

  const handleClick = () => {
    const line = polylineRef.current
    if (!line) return

    const bounds = line.getBounds() as LatLngBoundsExpression
    map.fitBounds(bounds, { padding: [40, 40] })
  }

  return (
    <>
      <Marker position={route.origin} icon={originIcon}>
        <Popup>{route.originName}</Popup>
      </Marker>
      <Marker position={route.destination} icon={destinationIcon}>
        <Popup>{route.destinationName}</Popup>
      </Marker>
      <Polyline
        ref={polylineRef}
        positions={[route.origin, route.destination]}
        pathOptions={{ color: 'gray', weight: 3 }}
        eventHandlers={{ click: handleClick }}
      />
    </>
  )
}
