const GEOAPIFY_KEY = import.meta.env.VITE_GEOAPIFY_KEY as string | undefined
const GEOAPIFY_ROUTING = 'https://api.geoapify.com/v1/routing'

/** Fetch road geometry for a single origin→destination pair from Geoapify. */
export async function fetchRoadPositions(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): Promise<[number, number][] | null> {
  if (!GEOAPIFY_KEY) return null
  try {
    const url =
      `${GEOAPIFY_ROUTING}` +
      `?waypoints=${origin.lat},${origin.lng}|${destination.lat},${destination.lng}` +
      `&mode=truck` +
      `&apiKey=${GEOAPIFY_KEY}`

    const res = await fetch(url)
    if (!res.ok) return null

    const data = await res.json()
    const feature = data.features?.[0]
    if (!feature) return null

    // GeoJSON coords are [lng, lat] — flip to [lat, lng] for Leaflet
    return (feature.geometry.coordinates as [number, number][][])
      .flat()
      .map(([lng, lat]) => [lat, lng] as [number, number])
  } catch {
    return null
  }
}
