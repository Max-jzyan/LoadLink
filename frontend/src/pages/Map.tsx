import { DriverMap, type RouteCoordinate } from '@/components/driverLoads/Map'
import { LoadCard } from '@/components/shared/LoadCard'
import { CheckInDialog } from '@/components/map/CheckInDialog'
import { CheckpointCheckIn } from '@/components/map/CheckpointCheckIn'
import { resolveRoutePath } from '@/lib/routePath'
import { fetchRoadPositions } from '@/lib/routing'
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
  const [roadFetchSettled, setRoadFetchSettled] = useState(false)
  // Track the load ID we've already started fetching so StrictMode doublefire doesn't duplicate requests
  const fetchingRef = useRef<string | null>(null)

  useEffect(() => {
    if (!load || load.route?.polyline) return
    if (fetchingRef.current === load._id) return
    fetchingRef.current = load._id

    fetchRoadPositions(load.originCoords, load.destinationCoords)
      .then(setRoadPositions)
      .finally(() => setRoadFetchSettled(true))
  }, [load])

  const isRoutePending = !!load && !load.route?.polyline && !roadFetchSettled

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

  const routePath = resolveRoutePath(routes[0])

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
          {!isRoutePending && <CheckpointCheckIn loadId={load._id} path={routePath} />}
        </div>
      )}

      <div className="relative h-[calc(100vh-280px)] rounded-xl border overflow-hidden">
        <DriverMap routes={routes} height="100%" checkIn={checkIn} />
        {isRoutePending && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-background/60 backdrop-blur-sm text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading route…
          </div>
        )}
      </div>
    </PageShell>
  )
}
