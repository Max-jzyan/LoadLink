import { useEventSource } from '@/components/auction/useEventSource'
import DeliveryTimeline from '@/components/driverLoads/DeliveryTimeline'
import { DriverMap } from '@/components/driverLoads/Map'
import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Search, SlidersHorizontal, Calendar, AlertTriangle, X } from 'lucide-react'
import DynamicCard from '@/components/layout/DynamicCard'
import PageShell from '@/components/layout/PageShell'
import { LoadCard } from '@/components/shared/LoadCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  useGetRecommendedLoadsQuery,
  useListDriverBidsQuery,
} from '@/services/driverApi/driverSlice'
import type { Load } from '@/services/loadApi/loadEnum'
import { useListAvailableLoadsQuery } from '@/services/loadApi/loadSlice'

// TODO: replace with auth context once firebase auth is wired up
const PLACEHOLDER_DRIVER_ID = '6a30df19f9e53fd472dd8954'

type MapLayer = 'route' | 'fuel' | 'rest'

export default function DriverAuctions() {
  const driverId = PLACEHOLDER_DRIVER_ID

  const {
    data: availableLoads = [],
    isLoading,
    refetch: refetchAvailable,
  } = useListAvailableLoadsQuery()
  const { data: recommendedLoads = [], refetch: refetchRecommended } =
    useGetRecommendedLoadsQuery(driverId)
  const { data: activeBids = [] } = useListDriverBidsQuery({ driverId, status: 'active' })

  const { data: loadPostedEvent } = useEventSource<{ loadId: string }>('/api/loads/stream')
  useEffect(() => {
    if (!loadPostedEvent) return
    refetchAvailable()
    refetchRecommended()
  }, [loadPostedEvent, refetchAvailable, refetchRecommended])

  const [selectedLoad, setSelectedLoad] = useState<Load | null>(null)
  const [searchText, setSearchText] = useState('')
  const [activeLayer, setActiveLayer] = useState<MapLayer>('route')

  // client-side text search on origin, destination, and commodity
  const filtered = useMemo(() => {
    if (!searchText.trim()) return availableLoads
    const q = searchText.toLowerCase()
    return availableLoads.filter(
      (l) =>
        l.originAddress.toLowerCase().includes(q) ||
        l.destinationAddress.toLowerCase().includes(q) ||
        l.commodity.toLowerCase().includes(q)
    )
  }, [availableLoads, searchText])

  const recIds = useMemo(() => new Set(recommendedLoads.map((l) => l._id)), [recommendedLoads])
  const recommended = useMemo(() => filtered.filter((l) => recIds.has(l._id)), [filtered, recIds])
  const other = useMemo(() => filtered.filter((l) => !recIds.has(l._id)), [filtered, recIds])

  // show only the selected load's route, or up to 20 available loads when none is selected
  const mapRoutes = useMemo(() => {
    const source = selectedLoad ? [selectedLoad] : availableLoads.slice(0, 20)
    return source.map((l) => ({
      id: l._id,
      origin: [l.originCoords.lat, l.originCoords.lng] as [number, number],
      originName: l.originAddress,
      destination: [l.destinationCoords.lat, l.destinationCoords.lng] as [number, number],
      destinationName: l.destinationAddress,
      status: l.status,
    }))
  }, [selectedLoad, availableLoads])

  const mapDescription = selectedLoad
    ? [
        selectedLoad.route
          ? `Distance: ${Math.round(selectedLoad.route.distanceKm * 0.621371)} mi`
          : null,
        selectedLoad.route ? `Est. ${Math.round(selectedLoad.route.durationHours)}h` : null,
      ]
        .filter(Boolean)
        .join('  ·  ')
    : 'Select a load to view route details'

  const renderLoadGroup = (loads: Load[]) =>
    loads.map((load) => (
      <div
        key={load._id}
        className={cn(
          'rounded-xl transition-shadow',
          selectedLoad?._id === load._id && 'ring-2 ring-primary ring-offset-1'
        )}
      >
        <LoadCard
          load={load}
          onClick={() => setSelectedLoad(load)}
          viewAuctionHref={`/driverAuctions/${load._id}`}
        />
      </div>
    ))

  // Search bar + filter controls — becomes the sticky bar content
  const searchControls = (
    <div className="flex items-center gap-1.5">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        <Input
          className="pl-8 h-8 text-sm"
          placeholder="Search loads, companies..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
        {searchText && (
          <button
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => setSearchText('')}
            aria-label="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <Button variant="outline" size="icon" className="h-8 w-8 shrink-0">
        <SlidersHorizontal className="w-3.5 h-3.5" />
      </Button>
      <Button variant="outline" size="icon" className="h-8 w-8 shrink-0">
        <Calendar className="w-3.5 h-3.5" />
      </Button>
    </div>
  )

  return (
    <PageShell
      title="Available Loads"
      subtitle={
        !isLoading
          ? `${availableLoads.length} load${availableLoads.length !== 1 ? 's' : ''}`
          : undefined
      }
      stickyBar={
        <>
          {searchControls}
          {activeBids.length > 0 && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 text-amber-800 text-xs mt-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-500" />
              <span>
                {activeBids.length} active bid{activeBids.length > 1 ? 's' : ''} — accepting a load
                will auto-cancel them
              </span>
            </div>
          )}
        </>
      }
    >
      <div className="flex gap-2 min-h-0">
        {/* left panel: scrollable load feed */}
        <div className="flex-[5] min-w-[400px] overflow-y-auto space-y-2 pl-1 pr-1">
          {isLoading && (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-28 rounded-xl border bg-accent/20 animate-pulse" />
              ))}
            </div>
          )}

          {!isLoading && recommended.length > 0 && (
            <>
              <p className="text-xs font-medium text-muted-foreground px-1">Recommended</p>
              {renderLoadGroup(recommended)}
            </>
          )}

          {!isLoading && other.length > 0 && (
            <>
              <p className="text-xs font-medium text-muted-foreground px-1 mt-2">
                {recommended.length > 0 ? 'Other loads' : 'Available loads'}
              </p>
              {renderLoadGroup(other)}
            </>
          )}

          {!isLoading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground text-sm">No loads found</p>
              {searchText && (
                <button
                  className="text-xs text-primary mt-1 hover:underline"
                  onClick={() => setSearchText('')}
                >
                  Clear search
                </button>
              )}
            </div>
          )}
        </div>

        {/* right panel: map + timeline */}
        <div className="flex-[11] min-w-0 space-y-2">
          <DynamicCard
            title="Shipment route overview"
            description={mapDescription}
            action={
              <div className="flex gap-1">
                {(['route', 'fuel', 'rest'] as MapLayer[]).map((layer) => (
                  <Button
                    key={layer}
                    size="sm"
                    variant={activeLayer === layer ? 'default' : 'outline'}
                    className="h-7 px-2.5 text-xs"
                    onClick={() => setActiveLayer(layer)}
                  >
                    {layer === 'route' ? 'Route' : layer === 'fuel' ? 'Fuel Stops' : 'Rest Areas'}
                  </Button>
                ))}
              </div>
            }
            rounded="sm"
          >
            <DriverMap
              routes={mapRoutes}
              selectedRouteId={selectedLoad?._id ?? null}
              height="300px"
            />
          </DynamicCard>

          <DynamicCard
            title="Delivery timeline"
            rounded="sm"
            action={
              selectedLoad && (
                <Button size="sm" asChild>
                  <Link to={`/driverAuctions/${selectedLoad._id}`}>View Auction</Link>
                </Button>
              )
            }
          >
            {selectedLoad ? (
              <DeliveryTimeline load={selectedLoad} />
            ) : (
              <div className="flex items-center justify-center h-28 text-muted-foreground text-sm">
                Select a load to view the delivery timeline
              </div>
            )}
          </DynamicCard>
        </div>
      </div>
    </PageShell>
  )
}
