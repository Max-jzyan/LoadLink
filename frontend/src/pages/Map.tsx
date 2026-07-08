import { DriverMap, type RouteCoordinate } from '@/components/driverLoads/Map'
import PageShell from '@/components/layout/PageShell'
import { selectMongoId, selectRole } from '@/services/authSlice'
import { useListCompanyLoadsQuery } from '@/services/loadApi/loadSlice'
import { useListDriverLoadsQuery } from '@/services/driverApi/driverSlice'
import { useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'

const GEOAPIFY_KEY = import.meta.env.VITE_GEOAPIFY_KEY as string | undefined
const GEOAPIFY_ROUTING = 'https://api.geoapify.com/v1/routing'

/** Fetch road geometry for a single origin→destination pair from Geoapify. */
async function fetchRoadPositions(
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

export default function MapPage() {
  const mongoId = useSelector(selectMongoId)
  const role = useSelector(selectRole)

  // Pick the right query based on user role
  const isCompany = role === 'company'

  const {
    data: companyLoads,
    isLoading: companyLoading,
    isError: companyError,
  } = useListCompanyLoadsQuery(mongoId ?? '', { skip: !isCompany || !mongoId })

  const {
    data: driverLoads,
    isLoading: driverLoading,
    isError: driverError,
  } = useListDriverLoadsQuery({ driverId: mongoId! }, { skip: isCompany || !mongoId })

  const loads = isCompany ? companyLoads : driverLoads
  const isLoading = isCompany ? companyLoading : driverLoading
  const isError = isCompany ? companyError : driverError

  // loadId -> road [lat, lng][] positions fetched from Geoapify for loads without a stored polyline
  const [roadPositions, setRoadPositions] = useState<Map<string, [number, number][]>>(new Map())
  // Track IDs we have already started fetching so StrictMode doublefire doesnt duplicate requests
  const fetchingRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!loads?.length) return

    const loadsWithoutRoute = loads.filter((l) => !l.route?.polyline)
    if (!loadsWithoutRoute.length) return

    loadsWithoutRoute.forEach((load) => {
      if (fetchingRef.current.has(load._id)) return
      fetchingRef.current.add(load._id)

      fetchRoadPositions(load.originCoords, load.destinationCoords).then((pts) => {
        if (!pts) return
        setRoadPositions((prev) => new Map(prev).set(load._id, pts))
      })
    })
  }, [loads])

  const routes: RouteCoordinate[] = (loads ?? []).map((load) => ({
    id: load._id,
    origin: [load.originCoords.lat, load.originCoords.lng],
    originName: load.originAddress,
    destination: [load.destinationCoords.lat, load.destinationCoords.lng],
    destinationName: load.destinationAddress,
    status: load.status,
    polyline: load.route?.polyline,
    positions: roadPositions.get(load._id),
  }))

  const count = routes.length

  return (
    <PageShell
      title="Route Map"
      subtitle={!isLoading && !isError ? `${count} load${count !== 1 ? 's' : ''}` : undefined}
    >
      {isError && (
        <p className="text-sm text-destructive mb-2">Failed to load routes. Please try again.</p>
      )}

      <div className="h-[calc(100vh-125px)] rounded-xl border overflow-hidden">
        <DriverMap routes={routes} height="100%" />
      </div>
    </PageShell>
  )
}
