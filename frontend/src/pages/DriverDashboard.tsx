import DriverLoadFilterBar, {
  type DriverLoadFilters,
} from '@/components/driverLoads/DriverLoadFilterBar'
import DriverLoadTable from '@/components/driverLoads/driverLoadTable'
import { DriverMap } from '@/components/driverLoads/Map'
import DynamicCard from '@/components/layout/DynamicCard'
import LoadsPageLayout from '@/components/layout/LoadsPageLayout'
import PageShell from '@/components/layout/PageShell'
import { useRefreshTimestamp } from '@/hooks/useRefreshTimestamp'
import { useRequiredMongoId } from '@/hooks/useAuth'
import {
  useListDriverBidsQuery,
  useListDriverLoadsQuery,
  useListDriverTrucksQuery,
} from '@/services/driverApi/driverSlice'
import { selectDriverLoads, setDriverLoads } from '@/services/driverLoadsSlice'
import type { AppDispatch } from '@/services/store'
import { LOAD_STATUSES, ACTIVE_STATUSES, HISTORICAL_STATUSES } from '@/types/enums'
import { Hammer, Package2, TrendingUp, Truck, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useDispatch, useSelector } from 'react-redux'
import { relativeTime } from '@/lib/utils'

const DEFAULT_FILTERS: DriverLoadFilters = {
  loadStatus: 'all',
  dateRange: undefined,
  truckType: '',
  minWeight: undefined,
  maxWeight: undefined,
  minPrice: undefined,
  maxPrice: undefined,
  selectedTruck: '',
  origin: '',
  destination: '',
}

export default function DriverDashboard() {
  const driverId = useRequiredMongoId()
  const dispatch = useDispatch<AppDispatch>()

  const {
    data: rawLoads = [],
    isLoading,
    isFetching,
    refetch,
    fulfilledTimeStamp,
  } = useListDriverLoadsQuery({ driverId })

  const { data: trucks = [] } = useListDriverTrucksQuery(driverId)

  const prevRawLoadsRef = useRef(rawLoads)
  useEffect(() => {
    if (rawLoads.length > 0 && rawLoads !== prevRawLoadsRef.current) {
      dispatch(setDriverLoads(rawLoads))
      prevRawLoadsRef.current = rawLoads
    }
  }, [rawLoads, dispatch])

  const availableLoads = useSelector(selectDriverLoads)

  const { lastManualRefresh, handleRefresh, captureInitialLoad } = useRefreshTimestamp()
  useEffect(() => {
    captureInitialLoad(fulfilledTimeStamp)
  }, [fulfilledTimeStamp, captureInitialLoad])

  const [filters, setFilters] = useState<DriverLoadFilters>(DEFAULT_FILTERS)

  // Debounce text and number inputs; select/date controls stay instant.
  const debouncedOrigin = useDebouncedValue(filters.origin, 400)
  const debouncedDestination = useDebouncedValue(filters.destination, 400)
  const debouncedMinWeight = useDebouncedValue(filters.minWeight, 400)
  const debouncedMaxWeight = useDebouncedValue(filters.maxWeight, 400)
  const debouncedMinPrice = useDebouncedValue(filters.minPrice, 400)
  const debouncedMaxPrice = useDebouncedValue(filters.maxPrice, 400)

  // Apply filters client-side
  const filteredLoads = useMemo(() => {
    let result = availableLoads

    // Status filter
    if (filters.loadStatus === 'active') {
      result = result.filter((load) => ACTIVE_STATUSES.has(load.status))
    } else if (filters.loadStatus === 'historical') {
      result = result.filter((load) => HISTORICAL_STATUSES.has(load.status))
    }

    // Date range filter (by createdAt)
    const dateRange = filters.dateRange
    if (dateRange?.from) {
      const from = dateRange.from
      result = result.filter((load) => new Date(load.createdAt) >= from)
    }
    if (dateRange?.to) {
      const to = dateRange.to
      result = result.filter((load) => new Date(load.createdAt) <= to)
    }

    // Truck type filter
    if (filters.truckType) {
      result = result.filter((load) => load.truckType === filters.truckType)
    }

    // Weight range filter
    if (debouncedMinWeight !== undefined) {
      result = result.filter((load) => load.weightLbs >= debouncedMinWeight!)
    }
    if (debouncedMaxWeight !== undefined) {
      result = result.filter((load) => load.weightLbs <= debouncedMaxWeight!)
    }

    // Price range filter (using auction currentPrice if available)
    if (debouncedMinPrice !== undefined || debouncedMaxPrice !== undefined) {
      result = result.filter((load) => {
        if (typeof load.auctionId !== 'object' || !load.auctionId) return false
        const price = load.auctionId.currentPrice
        if (debouncedMinPrice !== undefined && price < debouncedMinPrice) return false
        if (debouncedMaxPrice !== undefined && price > debouncedMaxPrice) return false
        return true
      })
    }

    // My Truck filter (selectedTruckId on load)
    if (filters.selectedTruck) {
      if (filters.selectedTruck === 'none') {
        result = result.filter((load) => !load.selectedTruckId)
      } else {
        result = result.filter((load) => load.selectedTruckId === filters.selectedTruck)
      }
    }

    // Origin / Destination substring filters
    if (debouncedOrigin) {
      const q = debouncedOrigin.toLowerCase()
      result = result.filter((load) => load.originAddress.toLowerCase().includes(q))
    }
    if (debouncedDestination) {
      const q = debouncedDestination.toLowerCase()
      result = result.filter((load) => load.destinationAddress.toLowerCase().includes(q))
    }

    return result
  }, [
    availableLoads,
    filters.loadStatus,
    filters.dateRange,
    filters.truckType,
    filters.selectedTruck,
    debouncedOrigin,
    debouncedDestination,
    debouncedMinWeight,
    debouncedMaxWeight,
    debouncedMinPrice,
    debouncedMaxPrice,
  ])

  const loadsInTransit = availableLoads.filter((load) => load.status === LOAD_STATUSES.InTransit)
  const completedLoads = availableLoads.filter((load) => load.status === LOAD_STATUSES.Completed)

  const { data: activeBids = [] } = useListDriverBidsQuery({ driverId })

  const openAuctionLoadIds = useMemo(() => {
    return new Set(
      availableLoads
        .filter((load) => load.status === LOAD_STATUSES.AuctionLive)
        .map((load) => load._id)
    )
  }, [availableLoads])

  const activeBidCount = useMemo(() => {
    return activeBids.filter((bid) => openAuctionLoadIds.has(bid.loadId)).length
  }, [activeBids, openAuctionLoadIds])

  const routes = filteredLoads.map((load) => ({
    id: load._id,
    origin: [load.originCoords.lat, load.originCoords.lng] as [number, number],
    originName: load.originAddress,
    destination: [load.destinationCoords.lat, load.destinationCoords.lng] as [number, number],
    destinationName: load.destinationAddress,
    status: load.status,
  }))

  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null)
  const handleResetView = useCallback(() => setSelectedRouteId(null), [])

  const onRefresh = useCallback(() => handleRefresh(refetch), [handleRefresh, refetch])
  const subtitle = lastManualRefresh ? `Updated ${relativeTime(lastManualRefresh)}` : undefined

  const handleRowClick = (load: (typeof filteredLoads)[number]) => {
    setSelectedRouteId(load._id)
  }

  const statsCards = (
    <>
      <DynamicCard title="My Loads" action={<Package2 className="text-primary" />}>
        <p className="text-4xl font-bold">{availableLoads.length}</p>
      </DynamicCard>
      <DynamicCard title="In Transit" action={<Truck className="text-green-500" />}>
        <p className="text-4xl font-bold">{loadsInTransit.length}</p>
      </DynamicCard>
      <DynamicCard title="Active Bids" action={<Hammer className="text-amber-500" />}>
        <p className="text-4xl font-bold">{activeBidCount}</p>
      </DynamicCard>
      <DynamicCard title="Completed Loads" action={<TrendingUp className="text-violet-500" />}>
        <p className="text-4xl font-bold">{completedLoads.length}</p>
      </DynamicCard>
    </>
  )

  return (
    <PageShell
      title="My Loads"
      subtitle={subtitle}
      stickyBar={
        <DriverLoadFilterBar filters={filters} onFiltersChange={setFilters} trucks={trucks} />
      }
      actions={
        <Button variant="outline" size="icon" onClick={onRefresh} title="Refresh">
          <RefreshCw className={isFetching ? 'animate-spin' : ''} />
        </Button>
      }
    >
      <LoadsPageLayout
        isLoading={isLoading}
        statsCards={statsCards}
        mapHeight={600}
        table={
          <DriverLoadTable
            title={isLoading ? 'Loading...' : 'Available Loads'}
            loads={filteredLoads}
            trucks={trucks}
            onRowClick={handleRowClick}
            selectedId={selectedRouteId}
          />
        }
        map={<DriverMap routes={routes} selectedRouteId={selectedRouteId} height="100%" />}
        mapAction={
          selectedRouteId ? (
            <Button variant="ghost" size="sm" onClick={handleResetView}>
              Reset View
            </Button>
          ) : undefined
        }
      />
    </PageShell>
  )
}