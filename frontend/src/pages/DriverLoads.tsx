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
import { useSelector } from 'react-redux'
import { useState, useMemo } from 'react'

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

  // Fetch all loads currently on the auction board
  const { data: availableLoads = [], isLoading } = useListDriverLoadsQuery(
    { driverId: driverId! },
    { skip: !driverId }
  )

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

  const routes = filteredLoads.map((load) => ({
    id: load._id,
    origin: [load.originCoords.lat, load.originCoords.lng] as [number, number],
    originName: load.originAddress,
    destination: [load.destinationCoords.lat, load.destinationCoords.lng] as [number, number],
    destinationName: load.destinationAddress,
    status: load.status,
  }))

  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null)

  const handleRowClick = (load: (typeof filteredLoads)[number]) => {
    setSelectedRouteId(load._id)
  }

  return (
    <LayoutGrid>
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
        <Col size={4}>
          <DynamicCard title="My Loads">{availableLoads.length || <p>0</p>}</DynamicCard>
        </Col>
        <Col size={4}>
          <DynamicCard title="Current Loads in Transit">
            {loadsInTransit.length || <p>0</p>}
          </DynamicCard>
        </Col>
        <Col size={4}>
          <DynamicCard title="Active Bids">{activeBids.length || <p>0</p>}</DynamicCard>
        </Col>
        <Col size={4}>
          <DynamicCard title="Completed Loads">{completedLoads.length || <p>0</p>}</DynamicCard>
        </Col>
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
