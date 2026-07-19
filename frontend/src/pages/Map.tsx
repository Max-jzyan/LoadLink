import { DriverMap, type RouteCoordinate } from '@/components/driverLoads/Map'
import { LoadCard } from '@/components/shared/LoadCard'
import { CheckInDialog } from '@/components/map/CheckInDialog'
import { CheckInDebugBar } from '@/components/map/CheckInDebugBar'
import PageShell from '@/components/layout/PageShell'
import { ROLE_HOME } from '@/config/routes'
import { selectMongoId, selectRole } from '@/services/authSlice'
import { useGetLoadQuery } from '@/services/loadApi/loadSlice'
import { LOAD_STATUSES } from '@/types/enums'
import { useStreamNotificationsQuery } from '@/services/notificationApi/notificationSlice'
import { NOTIFICATION_TYPES } from '@/services/notificationApi/notificationEnum'
import { Loader2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { Navigate, useSearchParams } from 'react-router-dom'

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
  const role = useSelector(selectRole)
  const mongoId = useSelector(selectMongoId)
  const [searchParams] = useSearchParams()
  const loadId = searchParams.get('loadId')

  const {
    data: load,
    isLoading,
    isError,
    refetch: refetchLoad,
  } = useGetLoadQuery(loadId ?? '', { skip: !loadId })

  // Road [lat, lng][] positions fetched from Geoapify when the load has no stored polyline
  const [roadPositions, setRoadPositions] = useState<[number, number][] | null>(null)
  // Track the load ID we've already started fetching so StrictMode doublefire doesn't duplicate requests
  const fetchingRef = useRef<string | null>(null)

  useEffect(() => {
    if (!load || load.route?.polyline) return
    if (fetchingRef.current === load._id) return
    fetchingRef.current = load._id

    fetchRoadPositions(load.originCoords, load.destinationCoords).then(setRoadPositions)
  }, [load])

  // Reuses the same notification SSE stream NotificationBell already
  // subscribes to (RTK Query dedupes by query args, so this doesn't open a
  // second EventSource). When a check-in notification for this exact load
  // comes in, refetch so an already-open map picks up the new marker
  // without a manual reload.
  const { data: streamData } = useStreamNotificationsQuery(undefined)

  useEffect(() => {
    if (!streamData || !loadId) return
    if (!('_id' in streamData) || !('type' in streamData)) return
    if (streamData.type !== NOTIFICATION_TYPES.DRIVER_CHECKED_IN) return
    if (streamData.data?.loadId !== loadId) return
    refetchLoad()
  }, [streamData, loadId, refetchLoad])

  // Map is only reachable via a loadId param now (from an in-transit row's
  // "Track"/"Notify Company" button) — bounce back to the role's home page
  // for a bare /map visit (stale bookmark, typed URL, etc.)
  if (!loadId) {
    return <Navigate to={role ? ROLE_HOME[role] : '/'} replace />
  }

  if (isLoading) {
    return (
      <PageShell title="Route Map">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PageShell>
    )
  }

  if (isError || !load) {
    return (
      <PageShell title="Route Map">
        <p className="text-sm text-destructive">
          Failed to load this load. It may have been removed.
        </p>
      </PageShell>
    )
  }

  const routes: RouteCoordinate[] = [
    {
      id: load._id,
      origin: [load.originCoords.lat, load.originCoords.lng],
      originName: load.originAddress,
      destination: [load.destinationCoords.lat, load.destinationCoords.lng],
      destinationName: load.destinationAddress,
      status: load.status,
      polyline: load.route?.polyline,
      positions: roadPositions ?? undefined,
    },
  ]

  const assignedDriverId =
    typeof load.assignedDriverId === 'object' && load.assignedDriverId !== null
      ? load.assignedDriverId._id
      : load.assignedDriverId

  const canCheckIn =
    role === 'driver' &&
    !!mongoId &&
    assignedDriverId === mongoId &&
    load.status === LOAD_STATUSES.InTransit

  const checkIn = load.lastCheckIn
    ? {
        position: [load.lastCheckIn.coords.lat, load.lastCheckIn.coords.lng] as [number, number],
        checkedInAt: load.lastCheckIn.checkedInAt,
      }
    : null

  return (
    <PageShell
      title="Route Map"
      subtitle={`${load.originAddress.split(',')[0].trim()} → ${load.destinationAddress
        .split(',')[0]
        .trim()}`}
    >
      <div className="mb-3">
        <LoadCard load={load} />
      </div>

      {canCheckIn && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <CheckInDialog loadId={load._id} />
          {import.meta.env.DEV && <CheckInDebugBar loadId={load._id} />}
        </div>
      )}

      <div className="h-[calc(100vh-280px)] rounded-xl border overflow-hidden">
        <DriverMap routes={routes} height="100%" checkIn={checkIn} />
      </div>
    </PageShell>
  )
}
