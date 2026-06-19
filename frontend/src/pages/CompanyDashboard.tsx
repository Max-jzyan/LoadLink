import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
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
import { useSelector } from 'react-redux'
import { useGetCompanyDashboardQuery } from '@/services/companyApi/companyApi'
import { selectMongoId } from '@/services/authSlice'
import useAuth from '@/hooks/useAuth'
import { RoutePath } from '@/config/routes'
import { relativeTime } from '@/lib/utils'
import { LOAD_STATUSES } from '@/types/enums'
import type { LoadWithDetails } from '@/services/companyApi/companyTypes'

export default function CompanyDashboard() {
  const { user } = useAuth()
  const companyName = user?.displayName ?? user?.email?.split('@')[0] ?? null
  const companyId = useSelector(selectMongoId)

  const {
    data: dashboard,
    isLoading: dashLoading,
    isFetching,
    refetch,
    fulfilledTimeStamp,
  } = useGetCompanyDashboardQuery(companyId ?? '', {
    skip: !companyId,
    pollingInterval: 60000,
  })

  const loads = dashboard?.loads ?? []
  const summary = dashboard?.summary
  const isLoading = dashLoading && !dashboard

  // track when the user manually triggered a refresh so the relative timestamp
  // isn't reset by background polling every 60s
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

  const [selectedLoad, setSelectedLoad] = useState<LoadWithDetails | null>(null)

  const handleRefresh = useCallback(() => {
    refetch()
    setLastManualRefresh(Date.now())
  }, [refetch])

  // map in-transit loads to the shape DriverMap expects;
  // if a specific in-transit load is selected, zoom to just that one
  const transitRoutes = useMemo(() => {
    const source =
      selectedLoad?.status === LOAD_STATUSES.InTransit
        ? [selectedLoad]
        : loads.filter((l) => l.status === LOAD_STATUSES.InTransit)
    return source.map((l) => ({
      id: l._id,
      origin: [l.originCoords.lat, l.originCoords.lng] as [number, number],
      originName: l.originAddress,
      destination: [l.destinationCoords.lat, l.destinationCoords.lng] as [number, number],
      destinationName: l.destinationAddress,
      status: l.status,
    }))
  }, [loads, selectedLoad])

  return (
    <LayoutGrid>
      <Row size={1}>
        <Col size={16}>
          <div className="flex items-center justify-between px-2 h-full">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Active Loads</h1>
              {(companyName || lastManualRefresh) && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  {companyName}
                  {companyName && lastManualRefresh ? ' · ' : ''}
                  {lastManualRefresh ? `Updated ${relativeTime(lastManualRefresh)}` : ''}
                </p>
              )}
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
          <CompanyLoadTable
            title={isLoading ? 'Loading...' : 'Loads'}
            loads={loads}
            onRowClick={setSelectedLoad}
          />
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
            <DriverMap
              routes={transitRoutes}
              selectedRouteId={
                selectedLoad?.status === LOAD_STATUSES.InTransit ? selectedLoad._id : null
              }
              height="220px"
            />
          </DynamicCard>
        </Col>
      </Row>
    </LayoutGrid>
  )
}
