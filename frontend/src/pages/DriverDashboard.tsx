import DriverLoadFilterBar, {
  type DriverLoadFilters,
} from '@/components/driverLoads/DriverLoadFilterBar'
import DriverLoadTable from '@/components/driverLoads/driverLoadTable'
import { DriverMap } from '@/components/driverLoads/Map'
import DynamicCard from '@/components/layout/DynamicCard'
import LoadsPageLayout from '@/components/layout/LoadsPageLayout'
import PageShell from '@/components/layout/PageShell'
import { useRefreshTimestamp } from '@/hooks/useRefreshTimestamp'
import { selectMongoId } from '@/services/authSlice'
import { useListDriverBidsQuery, useListDriverLoadsQuery } from '@/services/driverApi/driverSlice'
import { selectDriverLoads, setDriverLoads } from '@/services/driverLoadsSlice'
import type { AppDispatch } from '@/services/store'
import { LOAD_STATUSES, ACTIVE_STATUSES, HISTORICAL_STATUSES } from '@/types/enums'
import { Hammer, Package2, TrendingUp, Truck, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
}

export default function DriverDashboard() {
  const driverId = useSelector(selectMongoId)
  const dispatch = useDispatch<AppDispatch>()

  // Fetch all loads currently on the auction board
  const {
    data: rawLoads = [],
    isLoading,
    isFetching,
    refetch,
    fulfilledTimeStamp,
  } = useListDriverLoadsQuery({ driverId: driverId! }, { skip: !driverId })

  // Sync RTK Query data into local slice on initial fetch and refresh
  const prevRawLoadsRef = useRef(rawLoads)
  useEffect(() => {
    if (rawLoads.length > 0 && rawLoads !== prevRawLoadsRef.current) {
      dispatch(setDriverLoads(rawLoads))
      prevRawLoadsRef.current = rawLoads
    }
  }, [rawLoads, dispatch])

  // Read from the slice so LoadActionsCell's optimistic updates are reflected
  const availableLoads = useSelector(selectDriverLoads)

  // Refresh timestamp tracking
  const { lastManualRefresh, handleRefresh, captureInitialLoad } = useRefreshTimestamp()
  useEffect(() => {
    captureInitialLoad(fulfilledTimeStamp)
  }, [fulfilledTimeStamp, captureInitialLoad])

  // Filter state
  const [filters, setFilters] = useState<DriverLoadFilters>(DEFAULT_FILTERS)

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
    if (filters.minWeight !== undefined) {
      result = result.filter((load) => load.weightLbs >= filters.minWeight!)
    }
    if (filters.maxWeight !== undefined) {
      result = result.filter((load) => load.weightLbs <= filters.maxWeight!)
    }

    // Price range filter (using auction currentPrice if available)
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      result = result.filter((load) => {
        if (typeof load.auctionId !== 'object' || !load.auctionId) return false
        const price = load.auctionId.currentPrice
        if (filters.minPrice !== undefined && price < filters.minPrice) return false
        if (filters.maxPrice !== undefined && price > filters.maxPrice) return false
        return true
      })
    }

    return result
  }, [availableLoads, filters])

  const loadsInTransit = availableLoads.filter((load) => load.status === LOAD_STATUSES.InTransit)
  const completedLoads = availableLoads.filter((load) => load.status === LOAD_STATUSES.Completed)

  const { data: activeBids = [] } = useListDriverBidsQuery(
    { driverId: driverId! },
    { skip: !driverId }
  )

  // Only count bids whose auction is still open (status === auction_live)
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

  const onRefresh = useCallback(() => handleRefresh(refetch), [handleRefresh, refetch])
  const subtitle = lastManualRefresh ? `Updated ${relativeTime(lastManualRefresh)}` : undefined

  const handleRowClick = (load: (typeof filteredLoads)[number]) => {
    setSelectedRouteId(load._id)
  }

  // ── Stats cards (bare DynamicCards — no Col wrappers) ──
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
      stickyBar={<DriverLoadFilterBar filters={filters} onFiltersChange={setFilters} />}
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
            onRowClick={handleRowClick}
          />
        }
        map={<DriverMap routes={routes} selectedRouteId={selectedRouteId} height="100%" />}
      />
    </PageShell>
  )
}
