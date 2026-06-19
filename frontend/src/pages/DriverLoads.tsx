import DriverLoadTable from '@/components/driverLoads/driverLoadTable'
import DriverLoadFilterBar, {
  type DriverLoadFilters,
} from '@/components/driverLoads/DriverLoadFilterBar'
import { DriverMap } from '@/components/driverLoads/Map'
import Col from '@/components/layout/Col'
import DynamicCard from '@/components/layout/DynamicCard'
import LayoutGrid from '@/components/layout/LayoutGrid'
import Row from '@/components/layout/Row'
import { useListDriverBidsQuery, useListDriverLoadsQuery } from '@/services/driverApi/driverSlice'
import { LOAD_STATUSES } from '@/types/enums'
import { selectMongoId } from '@/services/authSlice'
import { useSelector, useDispatch } from 'react-redux'
import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { setDriverLoads, selectDriverLoads } from '@/services/driverLoadsSlice'
import type { AppDispatch } from '@/services/store'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Package2, Hammer, Truck, TrendingUp, RefreshCw } from 'lucide-react'
import { relativeTime } from '@/lib/utils'

const ACTIVE_STATUSES = new Set<string>([
  LOAD_STATUSES.AuctionLive,
  LOAD_STATUSES.Booked,
  LOAD_STATUSES.InTransit,
])
const HISTORICAL_STATUSES = new Set<string>([
  LOAD_STATUSES.Completed,
  LOAD_STATUSES.Cancelled,
  LOAD_STATUSES.AuctionClosed,
])

const DEFAULT_FILTERS: DriverLoadFilters = {
  loadStatus: 'all',
  dateRange: undefined,
  truckType: '',
  minWeight: undefined,
  maxWeight: undefined,
  minPrice: undefined,
  maxPrice: undefined,
}

export default function DriverLoads() {
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

  // track when the user manually triggered a refresh so the relative timestamp isn't reset by background polling every 60s
  const [lastManualRefresh, setLastManualRefresh] = useState<number | null>(null)
  const capturedInitialLoad = useRef(false)
  useEffect(() => {
    if (fulfilledTimeStamp && !capturedInitialLoad.current) {
      capturedInitialLoad.current = true
      setLastManualRefresh(fulfilledTimeStamp)
    }
  }, [fulfilledTimeStamp])

  // tick every 30s so the relative timestamp re-renders without a full refetch
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000)
    return () => clearInterval(id)
  }, [])

  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null)

  const handleRefresh = useCallback(() => {
    refetch()
    setLastManualRefresh(Date.now())
  }, [refetch])

  const handleRowClick = (load: (typeof filteredLoads)[number]) => {
    setSelectedRouteId(load._id)
  }

  return (
    <LayoutGrid>
      <Row size={1}>
        <Col size={16}>
          <div className="flex items-center justify-between px-2 h-full">
            <div>
              <h1 className="text-2xl font-bold text-foreground">My Loads</h1>
              {lastManualRefresh && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  Updated {relativeTime(lastManualRefresh)}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" onClick={handleRefresh} title="Refresh">
                <RefreshCw className={isFetching ? 'animate-spin' : ''} />
              </Button>
            </div>
          </div>
        </Col>
      </Row>
      <Row size={1}>
        <Col size={16}>
          <DynamicCard noBorder noBackground noPadding>
            <div className="p-3">
              <DriverLoadFilterBar filters={filters} onFiltersChange={setFilters} />
            </div>
          </DynamicCard>
        </Col>
      </Row>
      <Row size={2}>
        {isLoading ? (
          <Col size={16}>
            <div className="flex gap-2 h-full">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="flex-1 rounded-xl" />
              ))}
            </div>
          </Col>
        ) : (
          <>
            <Col size={4}>
              <DynamicCard title="My Loads" action={<Package2 className="text-primary" />}>
                <p className="text-4xl font-bold">{availableLoads.length}</p>
              </DynamicCard>
            </Col>
            <Col size={4}>
              <DynamicCard title="In Transit" action={<Truck className="text-green-500" />}>
                <p className="text-4xl font-bold">{loadsInTransit.length}</p>
              </DynamicCard>
            </Col>
            <Col size={4}>
              <DynamicCard title="Active Bids" action={<Hammer className="text-amber-500" />}>
                <p className="text-4xl font-bold">{activeBidCount}</p>
              </DynamicCard>
            </Col>
            <Col size={4}>
              <DynamicCard
                title="Completed Loads"
                action={<TrendingUp className="text-violet-500" />}
              >
                <p className="text-4xl font-bold">{completedLoads.length}</p>
              </DynamicCard>
            </Col>
          </>
        )}
      </Row>
      <Row size={7}>
        <Col size={16}>
          <DriverLoadTable
            title={isLoading ? 'Loading...' : 'Available Loads'}
            loads={filteredLoads}
            onRowClick={handleRowClick}
          />
        </Col>
      </Row>
      <Row size={8}>
        <Col size={16}>
          <DynamicCard title="Map">
            <DriverMap routes={routes} selectedRouteId={selectedRouteId} />
          </DynamicCard>
        </Col>
      </Row>
    </LayoutGrid>
  )
}
