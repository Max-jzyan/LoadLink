import { haversineDistanceKmRaw } from '@/lib/geo'

export interface Checkpoint {
  label: string
  lat: number
  lng: number
}

const MAX_CHECKPOINTS = 5
const CHECKPOINT_SPACING_KM = 100

/**
 * Generates evenly-spaced checkpoints along an ordered road path (excluding
 * the origin and destination themselves), for a driver to check in at while
 * in transit. Checkpoint count follows floor(totalKm / 100), capped at 5;
 * routes under 100km get none. Each checkpoint is placed by linear
 * interpolation between the two path vertices bracketing its target
 * cumulative distance — this works whether `path` is a dense road-following
 * list (fetched positions / decoded polyline) or just a 2-point
 * [origin, destination] straight line.
 */
export function generateCheckpoints(path: [number, number][]): Checkpoint[] {
  if (path.length < 2) return []

  const cumKm: number[] = [0]
  for (let i = 1; i < path.length; i++) {
    const [lat1, lng1] = path[i - 1]
    const [lat2, lng2] = path[i]
    cumKm.push(cumKm[i - 1] + haversineDistanceKmRaw(lat1, lng1, lat2, lng2))
  }
  const totalKm = cumKm[cumKm.length - 1]

  const numCheckpoints = Math.min(MAX_CHECKPOINTS, Math.floor(totalKm / CHECKPOINT_SPACING_KM))
  if (numCheckpoints <= 0) return []

  const checkpoints: Checkpoint[] = []
  for (let i = 1; i <= numCheckpoints; i++) {
    const targetKm = (totalKm * i) / (numCheckpoints + 1)
    const { lat, lng } = pointAtDistance(path, cumKm, targetKm)
    checkpoints.push({ label: `Checkpoint ${i} (~${Math.round(targetKm)} km)`, lat, lng })
  }
  return checkpoints
}

function pointAtDistance(
  path: [number, number][],
  cumKm: number[],
  targetKm: number
): { lat: number; lng: number } {
  let j = 0
  while (j < cumKm.length - 2 && cumKm[j + 1] < targetKm) j++

  const segStart = cumKm[j]
  const segEnd = cumKm[j + 1]
  const segLen = segEnd - segStart
  const frac = segLen > 0 ? Math.min(1, Math.max(0, (targetKm - segStart) / segLen)) : 0

  const [lat1, lng1] = path[j]
  const [lat2, lng2] = path[j + 1]
  return { lat: lat1 + (lat2 - lat1) * frac, lng: lng1 + (lng2 - lng1) * frac }
}
