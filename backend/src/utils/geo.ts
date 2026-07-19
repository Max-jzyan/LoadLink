function isNumericInput(value: unknown): value is number | string {
  return typeof value === 'number' || typeof value === 'string'
}

/**
 * Parses raw lat/lng values into a coordinate, or null if absent/invalid.
 * Only accepts number/string inputs before coercing — rejects arrays,
 * objects, booleans, etc. outright (a bare `Number(value)` would silently
 * coerce a single-element array like `[49.28]` into `49.28`).
 */
export function parseLatLng(rawLat: unknown, rawLng: unknown): { lat: number; lng: number } | null {
  if (!isNumericInput(rawLat) || !isNumericInput(rawLng)) return null
  const lat = Number(rawLat)
  const lng = Number(rawLng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
  return { lat, lng }
}
