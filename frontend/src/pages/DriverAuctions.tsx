import { useEventSource } from '@/components/auction/useEventSource'
import DeliveryTimeline from '@/components/driverLoads/DeliveryTimeline'
import { DriverMap } from '@/components/driverLoads/Map'
import { DetailedEligibilityPanel } from '@/components/driverLoads/DetailedEligibilityPanel'
import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import type { DateRange } from 'react-day-picker'
import { AlertTriangle, LocateFixed, Loader2 } from 'lucide-react'
import DynamicCard from '@/components/layout/DynamicCard'
import PageShell from '@/components/layout/PageShell'
import { LoadCard } from '@/components/shared/LoadCard'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import {
  useGetScoredLoadsQuery,
  useListDriverBidsQuery,
  useGetAiStatusQuery,
  useGetDriverProfileQuery,
} from '@/services/driverApi/driverSlice'
import type { Load } from '@/services/loadApi/loadEnum'
import { useListAvailableLoadsQuery } from '@/services/loadApi/loadSlice'
import { useGetFeedPreferencesQuery } from '@/services/blocklistApi/blocklistSlice'
import { getAuctionPrice } from '@/lib/loadHelpers'
import { estimateKm } from '@/lib/geo'
import { useRequiredMongoId } from '@/hooks/useAuth'
import { useCurrentLocation } from '@/hooks/useCurrentLocation'
import type { ScoredLoad } from '@/services/driverApi/driverEnum'
import { DriverLoadFilters } from '@/components/driverLoads/DriverLoadFilters'
import {
  AiInsightsPanel,
  AiFuelStopsPanel,
  AiRestAreasPanel,
} from '@/components/driverLoads/AiInsightsPanel'
import { showError, showSuccess } from '@/lib/toast'
import { RoutePath } from '@/config/routes'

import './DriverAuctions.less';

type MapLayer = 'route' | 'fuel' | 'rest'

// Load enriched with scoring metadata from driver profile analysis
export interface EnrichedLoad extends Load {
  _scored?: ScoredLoad
}


import type { SortKey, EligibilityFilter } from '@/components/driverLoads/DriverLoadFilters.types'

export default function DriverAuctions() {
  const driverId = useRequiredMongoId()
  const loadFeedRef = useRef<HTMLDivElement>(null)

  const {
    data: availableLoads = [],
    isLoading,
    refetch: refetchAvailable,
  } = useListAvailableLoadsQuery()
  const {
    location,
    status: locationStatus,
    error: locationError,
    requestLocation,
    clearLocation,
  } = useCurrentLocation()
  const { data: driverProfile } = useGetDriverProfileQuery(driverId)
  const driverMaxDeadheadMiles = driverProfile?.pricingPreferences?.preferredMaxDeadheadMiles ?? 0
  const driverDeadheadRadiusMeters = driverMaxDeadheadMiles * 1609.34

  const { data: scoredLoads = [], refetch: refetchScored } = useGetScoredLoadsQuery(
    location ? { driverId, lat: location.lat, lng: location.lng } : driverId
  )
  const { data: activeBids = [] } = useListDriverBidsQuery({ driverId, status: 'active' })
  const { data: aiStatus } = useGetAiStatusQuery()
  const aiAvailable = aiStatus?.openrouterConfigured ?? false
  const { data: feedPrefs } = useGetFeedPreferencesQuery(driverId)
  const hideBelowMinimum = feedPrefs?.hideBelowMinimum ?? false

  useEffect(() => {
    if (locationStatus === 'success') {
      showSuccess('Location updated — loads are now tailored to where you are.')
    } else if (locationStatus === 'error' && locationError) {
      showError(locationError)
    }
  }, [locationError, locationStatus])

  const { data: loadPostedEvent } = useEventSource<{ loadId: string }>('/api/loads/stream')
  useEffect(() => {
    if (!loadPostedEvent) return
    refetchAvailable()
    refetchScored()
  }, [loadPostedEvent, refetchAvailable, refetchScored])

  const [selectedLoad, setSelectedLoad] = useState<EnrichedLoad | null>(null)
  const [aiTriggered, setAiTriggered] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [activeLayer, setActiveLayer] = useState<MapLayer>('route')
  const [sortKey, setSortKey] = useState<SortKey>('recommended')
  const [eligibilityFilter, setEligibilityFilter] = useState<EligibilityFilter>('all')
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)

  // Build a map from loadId → ScoredLoad for quick lookup
  const scoredMap = useMemo(() => {
    const map = new Map<string, ScoredLoad>()
    for (const s of scoredLoads) {
      map.set(s.loadId, s)
    }
    return map
  }, [scoredLoads])

  // Merge Load data with ScoredLoad metadata
  const enrichedLoads = useMemo((): EnrichedLoad[] => {
    return availableLoads.map((load) => ({
      ...load,
      _scored: scoredMap.get(load._id),
    }))
  }, [availableLoads, scoredMap])

  // Client-side text search on origin, destination, and commodity
  const textFiltered = useMemo(() => {
    if (!searchText.trim()) return enrichedLoads
    const q = searchText.toLowerCase()
    return enrichedLoads.filter(
      (l) =>
        l.originAddress.toLowerCase().includes(q) ||
        l.destinationAddress.toLowerCase().includes(q) ||
        l.commodity.toLowerCase().includes(q)
    )
  }, [enrichedLoads, searchText])

  // Apply date filter (filter by pickupTime within date range)
  const dateFiltered = useMemo(() => {
    if (!dateRange?.from && !dateRange?.to) return textFiltered
    return textFiltered.filter((l) => {
      const pickupDate = new Date(l.pickupTime)
      if (dateRange.from && pickupDate < dateRange.from) return false
      if (dateRange.to) {
        const endDate = new Date(dateRange.to)
        endDate.setHours(23, 59, 59, 999) // Include the entire end date
        if (pickupDate > endDate) return false
      }
      return true
    })
  }, [textFiltered, dateRange])

  const minimumFiltered = useMemo(() => {
    if (!hideBelowMinimum) return dateFiltered
    return dateFiltered.filter((l) => {
      const flags = l._scored?.eligibilityFlags
      if (!flags) return true
      return flags.eligibleMinRate && flags.eligibleMinValue
    })
  }, [dateFiltered, hideBelowMinimum])

  // Apply eligibility filter
  const eligibilityFiltered = useMemo(() => {
    if (eligibilityFilter === 'all') return minimumFiltered
    return minimumFiltered.filter((l) => {
      const scored = l._scored
      if (!scored) return false
      const isEligible = scored.eligibilityFlags.isEligible
      const score = scored.recommendationScore
      switch (eligibilityFilter) {
        case 'eligible':
          return isEligible
        case 'high-score':
          return score >= 80
        case 'issues-critical':
          return !isEligible && scored.eligibilitySeverity === 'critical'
        case 'issues-minor':
          return !isEligible && scored.eligibilitySeverity === 'minor'
        default:
          return true
      }
    })
  }, [minimumFiltered, eligibilityFilter])

  // Sort
  const sorted = useMemo(() => {
    const arr = [...eligibilityFiltered]
    switch (sortKey) {
      case 'recommended':
        arr.sort(
          (a, b) => (b._scored?.recommendationScore ?? 0) - (a._scored?.recommendationScore ?? 0)
        )
        break
      case 'pickup_asc':
        arr.sort((a, b) => new Date(a.pickupTime).getTime() - new Date(b.pickupTime).getTime())
        break
      case 'pickup_desc':
        arr.sort((a, b) => new Date(b.pickupTime).getTime() - new Date(a.pickupTime).getTime())
        break
      case 'dropoff_asc':
        arr.sort((a, b) => new Date(a.dropoffTime).getTime() - new Date(b.dropoffTime).getTime())
        break
      case 'dropoff_desc':
        arr.sort((a, b) => new Date(b.dropoffTime).getTime() - new Date(a.dropoffTime).getTime())
        break
      case 'rate':
        arr.sort((a, b) => getAuctionPrice(b) - getAuctionPrice(a))
        break
      case 'distance':
        arr.sort((a, b) => {
          const distA = a.route?.distanceKm ?? estimateKm(a)
          const distB = b.route?.distanceKm ?? estimateKm(b)
          return distA - distB
        })
        break
    }
    return arr
  }, [eligibilityFiltered, sortKey])

  // Build map routes from all available loads (always show all routes on map)
  const mapRoutes = useMemo(() => {
    return availableLoads.slice(0, 20).map((l) => ({
      id: l._id,
      origin: [l.originCoords.lat, l.originCoords.lng] as [number, number],
      originName: l.originAddress,
      destination: [l.destinationCoords.lat, l.destinationCoords.lng] as [number, number],
      destinationName: l.destinationAddress,
      status: l.status,
    }))
  }, [availableLoads])

  const mapDescription = selectedLoad
    ? [
        selectedLoad.route
          ? `Distance: ${Math.round(selectedLoad.route.distanceKm * 0.621371)} mi`
          : null,
        selectedLoad.route ? `Est. ${Math.round(selectedLoad.route.durationHours)}h` : null,
      ]
        .filter(Boolean)
        .join('  ·  ')
    : `${availableLoads.length} load${availableLoads.length !== 1 ? 's' : ''} shown`

  // Handle clicking a route on the map: select the load and scroll the left panel
  const handleMapRouteClick = useCallback(
    (routeId: string) => {
      const load = availableLoads.find((l) => l._id === routeId)
      if (load) {
        // Merge with scored data if available
        const scored = scoredMap.get(load._id)
        const enriched: EnrichedLoad = scored ? { ...load, _scored: scored } : { ...load }
        setSelectedLoad(enriched)
        // Scroll to the card in the left panel
        setTimeout(() => {
          const cardEl = document.getElementById(`load-card-${routeId}`)
          cardEl?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }, 50)
      }
    },
    [availableLoads, scoredMap]
  )

  const renderLoadGroup = (loads: typeof sorted) =>
    loads.map((load) => {
      const scored = load._scored
      const flags = scored?.eligibilityFlags
      const isIneligible = flags && !flags.isEligible
      const isCriticalIneligible = !flags?.isEligible && scored?.eligibilitySeverity === 'critical'

      return (
        <div
          key={load._id}
          id={`load-card-${load._id}`}
          className={cn(
            'rounded-xl transition-shadow scroll-mt-4',
            selectedLoad?._id === load._id && 'ring-2 ring-primary ring-offset-1',
            isIneligible && 'opacity-65 hover:opacity-85 transition-opacity',
            isCriticalIneligible && 'hover:opacity-90'
          )}
        >
          <LoadCard
            load={load}
            onClick={() => setSelectedLoad(load)}
            viewAuctionHref={`/driverAuctions/${load._id}`}
            eligibilityFlags={flags}
            recommendationScore={scored?.recommendationScore}
            severity={scored?.eligibilitySeverity}
            highScoreHighlights={scored?.highScoreHighlights}
          />
        </div>
      )
    })


  const visibleCounts = useMemo(() => {
    let eligible = 0,
      issues = 0,
      highScore = 0,
      critical = 0,
      minor = 0
    for (const l of minimumFiltered) {
      const scored = l._scored
      if (!scored) continue
      const isEligible = scored.eligibilityFlags.isEligible
      if (isEligible) {
        eligible++
        if (scored.recommendationScore >= 80) highScore++
      } else {
        issues++
        if (scored.eligibilitySeverity === 'critical') critical++
        else minor++
      }
    }
    return { all: minimumFiltered.length, eligible, issues, highScore, critical, minor }
  }, [minimumFiltered])

  // Reset all filters
  const handleResetFilters = () => {
    setSearchText('')
    setEligibilityFilter('all')
    setDateRange(undefined)
  }

  const layerLabel = (layer: MapLayer) => {
    if (layer === 'route') return 'Route'
    if (layer === 'fuel') return 'Fuel Stops'
    return 'Rest Areas'
  }

  // Shared helper: renders the map card
  const renderMapCard = useCallback(
    (expandable: boolean) => (
      <DynamicCard
        title="Auction Routes"
        description={mapDescription}
        {...(expandable ? { expand: true } : {})}
        action={
          <div className="flex gap-1">
            {aiTriggered && (['route', 'fuel', 'rest'] as MapLayer[]).map((layer) => (
              <Button
                key={layer}
                size="sm"
                variant={activeLayer === layer ? 'default' : 'outline'}
                className="h-7 px-2.5 text-xs"
                onClick={() => setActiveLayer(layer)}
              >
                {layerLabel(layer)}
              </Button>
            ))}
          </div>
        }
        rounded="sm"
      >
        <DriverMap
          routes={mapRoutes}
          selectedRouteId={selectedLoad?._id ?? null}
          height={expandable ? '100%' : '300px'}
          onRouteClick={handleMapRouteClick}
          checkIn={location ? { position: [location.lat, location.lng], checkedInAt: new Date().toISOString() } : null}
          driverLocation={location}
          driverDeadheadRadiusMeters={location ? driverDeadheadRadiusMeters : undefined}
        />
      </DynamicCard>
    ),
    [mapDescription, aiTriggered, mapRoutes, selectedLoad?._id, handleMapRouteClick, location, driverDeadheadRadiusMeters, activeLayer]
  )

  const getEligibilityDescription = (scored: NonNullable<EnrichedLoad['_scored']>) => {
    if (scored.recommendationScore >= 80) return 'This load is a top match for your profile'
    if (scored.eligibilityFlags.isEligible) return 'You meet all eligibility requirements'
    return 'Some requirements need attention'
  }

  // Renders the details section for the mobile sheet: side-by-side eligibility + timeline
  const renderSheetDetails = useCallback(
    (load: EnrichedLoad | null) => (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {/* Eligibility Details (first) */}
        {load?._scored && (
          <DynamicCard
            title="Eligibility Details"
            description={getEligibilityDescription(load._scored)}
            rounded="sm"
          >
            <DetailedEligibilityPanel
              flags={load._scored.eligibilityFlags}
              score={load._scored.recommendationScore}
              severity={load._scored.eligibilitySeverity}
              highlights={load._scored.highScoreHighlights}
            />
          </DynamicCard>
        )}

        {/* Delivery Timeline */}
        <DynamicCard
          title="Delivery timeline"
          rounded="sm"
          action={
            load && (
              <Button size="sm" asChild>
                <Link to={`/driverAuctions/${load._id}`}>View Auction</Link>
              </Button>
            )
          }
        >
          {load ? (
            <DeliveryTimeline load={load} />
          ) : (
            <div className="flex items-center justify-center h-28 text-muted-foreground text-sm">
              Select a load to view the delivery timeline
            </div>
          )}
        </DynamicCard>
      </div>
    ),
    []
  )

  return (
    <PageShell
      noScroll
      title="Available Loads"
      subtitle={!isLoading ? `${sorted.length} load${sorted.length !== 1 ? 's' : ''}` : undefined}
      stickyBar={
        <>
          <DriverLoadFilters
            searchText={searchText}
            onSearchChange={setSearchText}
            sortKey={sortKey}
            onSortChange={setSortKey}
            eligibilityFilter={eligibilityFilter}
            onEligibilityChange={setEligibilityFilter}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            counts={{
              all: visibleCounts.all,
              eligible: visibleCounts.eligible,
              issues: visibleCounts.issues,
              highScore: visibleCounts.highScore,
              critical: visibleCounts.critical,
              minor: visibleCounts.minor,
            }}
            onReset={handleResetFilters}
            onAiClick={aiAvailable ? () => setAiTriggered(true) : undefined}
            aiActive={aiTriggered}
          />
          <div
            className={cn(
              'flex items-center gap-2 mt-2 rounded-md border px-3 py-2 transition-colors',
              location ? 'location-container-active' : 'border-transparent'
            )}
          >
            <Button
              variant={location ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => (location ? clearLocation() : requestLocation())}
              disabled={locationStatus === 'locating'}
              className={cn(location && 'location-active-glow')}
            >
              {locationStatus === 'locating' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <LocateFixed className="h-3.5 w-3.5" />
              )}
              {location ? 'Location set' : 'Use my location'}
            </Button>
            {location && (
              <span className="text-xs text-muted-foreground">
                Tailoring loads to your current location (within your max deadhead)
              </span>
            )}
          </div>
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
      <div className="flex gap-2 flex-1 min-h-0 h-full">
        {/* left panel: scrollable load feed */}
        <div ref={loadFeedRef}
          className="flex-[5] min-w-0 lg:min-w-[400px] overflow-y-auto h-full space-y-2 pl-1 pr-1 pt-2 pb-2">
          {/* AI insight banner — mounts only when user clicks the sparkles button */}
          {aiTriggered && (
            <AiInsightsPanel driverId={driverId} onDismiss={() => setAiTriggered(false)} />
          )}
          {isLoading && (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-28 rounded-xl" />
              ))}
            </div>
          )}

          {!isLoading && sorted.length > 0 && <>{renderLoadGroup(sorted)}</>}

          {!isLoading && sorted.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground text-sm">No loads found</p>
              {(searchText ||
                eligibilityFilter !== 'all' ||
                dateRange?.from ||
                dateRange?.to ||
                hideBelowMinimum) && (
                <div className="flex gap-2 mt-1">
                  {searchText && (
                    <button
                      className="text-xs text-primary hover:underline"
                      onClick={() => setSearchText('')}
                    >
                      Clear search
                    </button>
                  )}
                  {eligibilityFilter !== 'all' && (
                    <button
                      className="text-xs text-primary hover:underline"
                      onClick={() => setEligibilityFilter('all')}
                    >
                      Clear eligibility filter
                    </button>
                  )}
                  {(dateRange?.from || dateRange?.to) && (
                    <button
                      className="text-xs text-primary hover:underline"
                      onClick={() => setDateRange(undefined)}
                    >
                      Clear date filter
                    </button>
                  )}
                  {hideBelowMinimum && (
                    <Link
                      to={RoutePath.BlocklistPreferences}
                      className="text-xs text-primary hover:underline"
                    >
                      Adjust minimum-rate filter
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* right panel: map + AI panels + details (desktop) */}
        <div className="hidden lg:flex flex-[11] min-w-0 flex-col space-y-2 pt-2 pb-2">
          {renderMapCard(true)}
          {aiTriggered && (
            <>
              {/* AI fuel stop suggestions — auto-populates when a load is selected */}
              {activeLayer === 'fuel' && selectedLoad && (
                <AiFuelStopsPanel driverId={driverId} loadId={selectedLoad._id} />
              )}
              {activeLayer === 'fuel' && !selectedLoad && (
                <div className="rounded-xl border border-dashed border-amber-200 px-4 py-3 text-xs text-amber-600 text-center">
                  Select a load to see AI-suggested fuel stops
                </div>
              )}

              {/* AI rest area suggestions — auto-populates when a load is selected */}
              {activeLayer === 'rest' && selectedLoad && (
                <AiRestAreasPanel driverId={driverId} loadId={selectedLoad._id} />
              )}
              {activeLayer === 'rest' && !selectedLoad && (
                <div className="rounded-xl border border-dashed border-sky-200 px-4 py-3 text-xs text-sky-600 text-center">
                  Select a load to see AI-suggested rest stops
                </div>
              )}

              {/* Delivery timeline */}
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
            </>
          )}

          {/* Detailed Eligibility Panel */}
          {selectedLoad?._scored && (
            <DynamicCard
              title="Eligibility Details"
              description={getEligibilityDescription(selectedLoad._scored)}
              rounded="sm"
            >
              <DetailedEligibilityPanel
                flags={selectedLoad._scored.eligibilityFlags}
                score={selectedLoad._scored.recommendationScore}
                severity={selectedLoad._scored.eligibilitySeverity}
                highlights={selectedLoad._scored.highScoreHighlights}
              />
            </DynamicCard>
          )}
        </div>

        {/* Mobile sheet: shows when a load is selected (hidden on lg+) */}
        <div className="lg:hidden">
          <Sheet
            open={!!selectedLoad}
            onOpenChange={(open) => {
              if (!open) setSelectedLoad(null)
            }}
          >
            <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
              <SheetHeader>
                <SheetTitle>
                  {selectedLoad
                    ? `${selectedLoad.originAddress} → ${selectedLoad.destinationAddress}`
                    : 'Load Details'}
                </SheetTitle>
              </SheetHeader>
              <div className="space-y-2 mt-2">
                {renderMapCard(false)}
                {renderSheetDetails(selectedLoad)}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </PageShell>
  )
}
