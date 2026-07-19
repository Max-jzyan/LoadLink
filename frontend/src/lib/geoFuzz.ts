// A driver's check-in ping is never sent to the backend as their exact
// location — it's fuzzed client-side first. MAX_FUZZ_RADIUS_METERS is shared
// with the map's uncertainty-circle rendering so the visual radius always
// matches the actual worst-case fuzz distance.
export const MAX_FUZZ_RADIUS_METERS = 10_000
const MIN_FUZZ_RADIUS_METERS = 2_000

const EARTH_RADIUS_METERS = 6_371_000

export interface FuzzOptions {
  minRadiusMeters?: number
  maxRadiusMeters?: number
}

/**
 * Offsets a lat/lng by a random distance/bearing within a donut (annulus)
 * around the true point: distance is sampled uniformly from
 * [minRadiusMeters, maxRadiusMeters], not [0, max]. Sampling from [0, max]
 * would cluster fuzzed points near the true center — this keeps every ping
 * at least minRadiusMeters away.
 */
export function fuzzLocation(
  lat: number,
  lng: number,
  {
    minRadiusMeters = MIN_FUZZ_RADIUS_METERS,
    maxRadiusMeters = MAX_FUZZ_RADIUS_METERS,
  }: FuzzOptions = {}
): { lat: number; lng: number } {
  const distance = minRadiusMeters + Math.random() * (maxRadiusMeters - minRadiusMeters)
  const bearing = Math.random() * 2 * Math.PI

  const latRad = (lat * Math.PI) / 180
  const dLat = (distance * Math.cos(bearing)) / EARTH_RADIUS_METERS
  const dLng = (distance * Math.sin(bearing)) / (EARTH_RADIUS_METERS * Math.cos(latRad))

  const fuzzedLat = lat + (dLat * 180) / Math.PI
  const fuzzedLng = lng + (dLng * 180) / Math.PI

  return {
    lat: Math.max(-90, Math.min(90, fuzzedLat)),
    lng: ((fuzzedLng + 540) % 360) - 180,
  }
}
