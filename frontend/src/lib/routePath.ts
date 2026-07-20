import type { LatLngExpression } from 'leaflet'

/**
 * AI helped heavily
 * Decode a Google-encoded polyline string into an array of [lat, lng] pairs.
 * Implements the standard precision-5 algorithm used by OSRM / Google Maps.
 */
function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = []
  let index = 0
  const len = encoded.length
  let lat = 0
  let lng = 0

  while (index < len) {
    let b: number
    let shift = 0
    let result = 0
    do {
      b = encoded.charCodeAt(index++) - 63
      result |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 0x20)
    lat += result & 1 ? ~(result >> 1) : result >> 1

    shift = 0
    result = 0
    do {
      b = encoded.charCodeAt(index++) - 63
      result |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 0x20)
    lng += result & 1 ? ~(result >> 1) : result >> 1

    points.push([lat / 1e5, lng / 1e5])
  }
  return points
}

export interface ResolvableRoute {
  origin: LatLngExpression
  destination: LatLngExpression
  // Google encoded polyline from the backend route field -> renders as road path when present
  polyline?: string
  // Prefetched road coordinates [lat, lng][] — takes priority over polyline
  positions?: [number, number][]
}

/**
 * Resolves the best-available path for a route: prefetched road positions →
 * decoded polyline → straight line between origin and destination. Shared by
 * the map's own rendering (FlyToRoute, RouteLine) and by callers that need
 * the same road-following path outside the map, e.g. checkpoint generation
 * for driver check-in.
 */
export function resolveRoutePath(route: ResolvableRoute): [number, number][] {
  if (route.positions) return route.positions
  if (route.polyline) return decodePolyline(route.polyline)
  return [route.origin as [number, number], route.destination as [number, number]]
}
