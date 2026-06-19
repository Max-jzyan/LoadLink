import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Package2, Hammer, Truck, TrendingUp, Plus, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import Col from '@/components/layout/Col'
import DynamicCard from '@/components/layout/DynamicCard'
import LayoutGrid from '@/components/layout/LayoutGrid'
import Row from '@/components/layout/Row'
import { DriverMap } from '@/components/driverLoads/Map'
import CompanyLoadTable from '@/components/companyLoads/companyLoadTable'
import { useGetCompanyDashboardQuery } from '@/services/companyApi/companyApi'
import { RoutePath } from '@/config/routes'
import { relativeTime } from '@/lib/utils'

// static seed ID for Greenleaf Logistics — replace with auth context once Firebase auth is wired
const GREENLEAF_ID = '000000000000000000000001'

export default function CompanyDashboard() {
  const {
    data: dashboard,
    isLoading: dashLoading,
    isFetching,
    refetch,
    fulfilledTimeStamp,
  } = useGetCompanyDashboardQuery(GREENLEAF_ID, {
    pollingInterval: 60000,
  })

  // tick every 30s so the relative timestamp re-renders without a full refetch
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000)
    return () => clearInterval(id)
  }, [])

  const loads = dashboard?.loads ?? []
  const summary = dashboard?.summary
  const isLoading = dashLoading && !dashboard

  const handleRefresh = useCallback(() => refetch(), [refetch])

  // map in-transit loads to the shape DriverMap expects
  const transitRoutes = loads
    .filter((l) => l.status === 'in_transit')
    .map((l) => ({
      id: l._id,
      origin: [l.originCoords.lat, l.originCoords.lng] as [number, number],
      originName: l.originAddress,
      destination: [l.destinationCoords.lat, l.destinationCoords.lng] as [number, number],
      destinationName: l.destinationAddress,
      status: l.status,
    }))

  return (
    <LayoutGrid>
      <Row size={1}>
        <Col size={16}>
          <div className="flex items-center justify-between px-2 h-full">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Active Loads</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Greenleaf Logistics
                {fulfilledTimeStamp ? ` · Updated ${relativeTime(fulfilledTimeStamp)}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" onClick={handleRefresh} title="Refresh">
                <RefreshCw className={isFetching ? 'animate-spin' : ''} />
              </Button>
              <Button asChild>
                <Link to={RoutePath.PostLoad}>
                  <Plus />
                  Post New Load
                </Link>
              </Button>
            </div>
          </div>
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
              <DynamicCard title="Active Loads" action={<Package2 className="text-primary" />}>
                <p className="text-4xl font-bold">{summary?.activeLoads ?? 0}</p>
              </DynamicCard>
            </Col>
            <Col size={4}>
              <DynamicCard title="Live Auctions" action={<Hammer className="text-amber-500" />}>
                <p className="text-4xl font-bold">{summary?.liveAuctions ?? 0}</p>
              </DynamicCard>
            </Col>
            <Col size={4}>
              <DynamicCard title="In Transit" action={<Truck className="text-green-500" />}>
                <p className="text-4xl font-bold">{summary?.inTransit ?? 0}</p>
              </DynamicCard>
            </Col>
            <Col size={4}>
              <DynamicCard
                title="Total Bids Today"
                action={<TrendingUp className="text-violet-500" />}
              >
                <p className="text-4xl font-bold">{summary?.totalBidsToday ?? 0}</p>
              </DynamicCard>
            </Col>
          </>
        )}
      </Row>

      <Row size={7}>
        <Col size={16}>
          <CompanyLoadTable title={isLoading ? 'Loading...' : 'Loads'} loads={loads} />
        </Col>
      </Row>

      <Row size={6}>
        <Col size={16}>
          <DynamicCard
            title="Routes in Progress"
            action={
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                {summary?.inTransit ?? 0} in transit
              </span>
            }
          >
            <DriverMap routes={transitRoutes} height="220px" />
          </DynamicCard>
        </Col>
      </Row>
    </LayoutGrid>
  )
}
