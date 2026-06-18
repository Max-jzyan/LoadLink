const GEOAPIFY_BASE = 'https://api.geoapify.com/v1/routing'

export interface RouteSegment {
  polyline: string
  distanceKm: number
  durationHours: number
}

// Geoapify GeoJSON response types

interface GeoapifyGeoJsonResponse {
  features: Array<{
    geometry: {
      type: 'MultiLineString'
      // Each element is one leg -> each coord is [longitude, latitude]
      coordinates: [number, number][][]
    }
    properties: {
      distance: number // meters
      time: number // seconds
    }
  }>
}

// AI generated
// ── Google polyline encoder (precision 5) ──────────────────────────────────

function encodeValue(value: number): string {
  let v = value < 0 ? ~(value << 1) : value << 1
  let chunk = ''
  while (v >= 0x20) {
    chunk += String.fromCharCode((0x20 | (v & 0x1f)) + 63)
    v >>= 5
  }
  chunk += String.fromCharCode(v + 63)
  return chunk
}

function encodePolyline(points: [number, number][]): string {
  let encoded = ''
  let prevLat = 0
  let prevLng = 0
  for (const [lat, lng] of points) {
    const rLat = Math.round(lat * 1e5)
    const rLng = Math.round(lng * 1e5)
    encoded += encodeValue(rLat - prevLat)
    encoded += encodeValue(rLng - prevLng)
    prevLat = rLat
    prevLng = rLng
  }
  return encoded
}

// API call
export async function computeRoute(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): Promise<RouteSegment | null> {
  const apiKey = process.env.GEOAPIFY_KEY

  if (!apiKey) {
    console.warn('[routing debug] GEOAPIFY_KEY is not set — skipping route computation')
    return null
  }

  const url =
    `${GEOAPIFY_BASE}` +
    `?waypoints=${origin.lat},${origin.lng}|${destination.lat},${destination.lng}` +
    `&mode=truck` +
    `&apiKey=${apiKey}`

  console.log('[routing debug] fetching:', url.replace(apiKey, '***'))

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) })

    console.log('[routing debug] response status:', res.status)

    if (!res.ok) {
      const text = await res.text()
      console.error('[routing debug] Geoapify error:', res.status, text)
      return null
    }

    const data = (await res.json()) as GeoapifyGeoJsonResponse
    const feature = data.features?.[0]

    if (!feature) {
      console.warn('[routing debug] no features in Geoapify response')
      return null
    }

    const points: [number, number][] = feature.geometry.coordinates
      .flat()
      .map(([lng, lat]) => [lat, lng])

    if (!points.length) {
      console.warn('[routing debug] empty coordinate list')
      return null
    }

    const result: RouteSegment = {
      polyline: encodePolyline(points),
      distanceKm: feature.properties.distance / 1_000,
      durationHours: feature.properties.time / 3_600,
    }

    console.log('[routing debug] success — distanceKm:', result.distanceKm.toFixed(1))
    return result
  } catch (err) {
    console.error('[routing debug] fetch failed:', err)
    return null
  }
}
