/**
 * Calculate the great-circle distance between two coordinates on Earth
 * using the Haversine formula.
 *
 * @returns Distance in kilometres, rounded to the nearest integer.
 */
export function haversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371 // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c)
}

import type { Load } from '@/services/loadApi/loadEnum'

/** Estimate distance in km using loose haversine (returns raw float, not rounded). */
export function estimateKm(a: Pick<Load, 'originCoords' | 'destinationCoords'>): number {
  if (!a.originCoords || !a.destinationCoords) return 0
  return haversineDistanceKm(
    a.originCoords.lat,
    a.originCoords.lng,
    a.destinationCoords.lat,
    a.destinationCoords.lng
  )
}
