import { useEventSource } from '@/components/auction/useEventSource'
import DeliveryTimeline from '@/components/driverLoads/DeliveryTimeline'
import { DriverMap } from '@/components/driverLoads/Map'
import { DetailedEligibilityPanel } from '@/components/driverLoads/DetailedEligibilityPanel'
import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import type { DateRange } from 'react-day-picker'
import { AlertTriangle } from 'lucide-react'
import DynamicCard from '@/components/layout/DynamicCard'
import PageShell from '@/components/layout/PageShell'
import { LoadCard } from '@/components/shared/LoadCard'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useGetScoredLoadsQuery, useListDriverBidsQuery } from '@/services/driverApi/driverSlice'
import type { Load } from '@/services/loadApi/loadEnum'
import { useListAvailableLoadsQuery } from '@/services/loadApi/loadSlice'
import { getAuctionPrice } from '@/lib/loadHelpers'
import { estimateKm } from '@/lib/geo'
import { useRequiredMongoId } from '@/hooks/useAuth'
import type { ScoredLoad } from '@/services/driverApi/driverEnum'
import { DriverLoadFilters } from '@/components/driverLoads/DriverLoadFilters'

type MapLayer = 'route' | 'fuel' | 'rest'

// Load enriched with scoring metadata from driver profile analysis
export interface EnrichedLoad extends Load {
  _scored?: ScoredLoad
}

import type { SortKey, EligibilityFilter } from '@/components/driverLoads/DriverLoadFilters.types'

export default function DriverAuctions() {
  const driverId = useRequiredMongoId()

  const {
    data: availableLoads = [],
    isLoading,
    refetch: refetchAvailable,
  } = useListAvailableLoadsQuery()
  const { data: scoredLoads = [], refetch: refetchScored } = useGetScoredLoadsQuery(driverId)
  const { data: activeBids = [] } = useListDriverBidsQuery({ driverId, status: 'active' })

  const { data: loadPostedEvent } = useEventSource<{ loadId: string }>('/api/loads/stream')
  useEffect(() => {
    if (!loadPostedEvent) return
    refetchAvailable()
    refetchScored()
  }, [loadPostedEvent, refetchAvailable, refetchScored])

  const [selectedLoad, setSelectedLoad] = useState<EnrichedLoad | null>(null)
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

  // Apply eligibility filter
  const eligibilityFiltered = useMemo(() => {
    if (eligibilityFilter === 'all') return dateFiltered
    return dateFiltered.filter((l) => {
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
  }, [dateFiltered, eligibilityFilter])

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

  // show only the selected load's route, or up to 20 loads when none is selected
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

  const renderLoadGroup = (loads: typeof sorted) =>
    loads.map((load) => {
      const scored = load._scored
      const flags = scored?.eligibilityFlags
      const isIneligible = flags && !flags.isEligible
      const isCriticalIneligible = !flags?.isEligible && scored?.eligibilitySeverity === 'critical'

      return (
        <div
          key={load._id}
          className={cn(
            'rounded-xl transition-shadow',
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

  // Counts for the filter buttons - based on dateFiltered to reflect date filtering
  const visibleCounts = useMemo(() => {
    let eligible = 0,
      issues = 0,
      highScore = 0,
      critical = 0,
      minor = 0
    for (const l of dateFiltered) {
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
    return { all: dateFiltered.length, eligible, issues, highScore, critical, minor }
  }, [dateFiltered])

  // Reset all filters
  const handleResetFilters = () => {
    setSearchText('')
    setEligibilityFilter('all')
    setDateRange(undefined)
  }

  return (
    <PageShell
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
          />
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
        <div className="flex-[5] min-w-[400px] overflow-y-auto space-y-2 pl-1 pr-1 pt-2 pb-2">
          {isLoading && (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-28 rounded-xl border bg-accent/20 animate-pulse" />
              ))}
            </div>
          )}

          {!isLoading && sorted.length > 0 && <>{renderLoadGroup(sorted)}</>}

          {!isLoading && sorted.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground text-sm">No loads found</p>
              {(searchText || eligibilityFilter !== 'all' || dateRange?.from || dateRange?.to) && (
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
                </div>
              )}
            </div>
          )}
        </div>

        {/* right panel: map + timeline */}
        <div className="flex-[11] min-w-0 space-y-2 pt-2 pb-2">
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

          {/* Detailed Eligibility Panel */}
          {selectedLoad?._scored && (
            <DynamicCard
              title="Eligibility Details"
              description={
                selectedLoad._scored.recommendationScore >= 80
                  ? 'This load is a top match for your profile'
                  : selectedLoad._scored.eligibilityFlags.isEligible
                    ? 'You meet all eligibility requirements'
                    : 'Some requirements need attention'
              }
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
      </div>
    </PageShell>
  )
}
