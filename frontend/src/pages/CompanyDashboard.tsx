import CompanyLoadFilterBar, {
  type CompanyLoadFilters,
  DEFAULT_FILTERS,
} from '@/components/companyLoads/CompanyLoadFilterBar'
import CompanyLoadTable from '@/components/companyLoads/companyLoadTable'
import { DriverMap } from '@/components/driverLoads/Map'
import DynamicCard from '@/components/layout/DynamicCard'
import LoadsPageLayout from '@/components/layout/LoadsPageLayout'
import PageShell from '@/components/layout/PageShell'
import { Button } from '@/components/ui/button'
import { RoutePath } from '@/config/routes'
import useAuth from '@/hooks/useAuth'
import { useRefreshTimestamp } from '@/hooks/useRefreshTimestamp'
import { selectMongoId } from '@/services/authSlice'
import { useGetCompanyDashboardQuery } from '@/services/companyApi/companyApi'
import type { LoadWithDetails } from '@/services/companyApi/companyTypes'
import { LOAD_STATUSES, ACTIVE_STATUSES, HISTORICAL_STATUSES } from '@/types/enums'
import { Hammer, Package2, Plus, RefreshCw, TrendingUp, Truck } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { relativeTime } from '@/lib/utils'

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

  const loads = useMemo(() => dashboard?.loads ?? [], [dashboard?.loads])
  const summary = dashboard?.summary
  const isLoading = dashLoading && !dashboard

  // Refresh timestamp tracking
  const { lastManualRefresh, handleRefresh, captureInitialLoad } = useRefreshTimestamp()
  useEffect(() => {
    captureInitialLoad(fulfilledTimeStamp)
  }, [fulfilledTimeStamp, captureInitialLoad])

  const onRefresh = useCallback(() => handleRefresh(refetch), [handleRefresh, refetch])
  const subtitle =
    [companyName, lastManualRefresh ? `Updated ${relativeTime(lastManualRefresh)}` : null]
      .filter(Boolean)
      .join(' · ') || undefined

  const [selectedLoad, setSelectedLoad] = useState<LoadWithDetails | null>(null)
  const [filters, setFilters] = useState<CompanyLoadFilters>(DEFAULT_FILTERS)

  // Apply filters client-side
  const filteredLoads = useMemo(() => {
    let result = loads

    // Status filter
    if (filters.loadStatus === 'active') {
      result = result.filter((l) => ACTIVE_STATUSES.has(l.status))
    } else if (filters.loadStatus === 'historical') {
      result = result.filter((l) => HISTORICAL_STATUSES.has(l.status))
    }

    // Date range filter (by createdAt)
    const dateRange = filters.dateRange
    if (dateRange?.from) {
      const from = dateRange.from
      result = result.filter((l) => new Date(l.createdAt) >= from)
    }
    if (dateRange?.to) {
      const to = dateRange.to
      result = result.filter((l) => new Date(l.createdAt) <= to)
    }

    return result
  }, [loads, filters])

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

  // ── Stats cards (bare DynamicCards — no Col wrappers) ──
  const statsCards = (
    <>
      <DynamicCard title="Active Loads" action={<Package2 className="text-primary" />}>
        <p className="text-4xl font-bold">{summary?.activeLoads ?? 0}</p>
      </DynamicCard>
      <DynamicCard title="Live Auctions" action={<Hammer className="text-amber-500" />}>
        <p className="text-4xl font-bold">{summary?.liveAuctions ?? 0}</p>
      </DynamicCard>
      <DynamicCard title="In Transit" action={<Truck className="text-green-500" />}>
        <p className="text-4xl font-bold">{summary?.inTransit ?? 0}</p>
      </DynamicCard>
      <DynamicCard title="Total Bids Today" action={<TrendingUp className="text-violet-500" />}>
        <p className="text-4xl font-bold">{summary?.totalBidsToday ?? 0}</p>
      </DynamicCard>
    </>
  )

  return (
    <PageShell
      title="Active Loads"
      subtitle={subtitle}
      stickyBar={<CompanyLoadFilterBar filters={filters} onFiltersChange={setFilters} />}
      actions={
        <>
          <Button variant="outline" size="icon" onClick={onRefresh} title="Refresh">
            <RefreshCw className={isFetching ? 'animate-spin' : ''} />
          </Button>
          <Button asChild>
            <Link to={RoutePath.PostLoad}>
              <Plus />
              Post New Load
            </Link>
          </Button>
        </>
      }
    >
      <LoadsPageLayout
        isLoading={isLoading}
        statsCards={statsCards}
        mapHeight={600}
        table={
          <CompanyLoadTable
            title={isLoading ? 'Loading...' : 'Loads'}
            loads={filteredLoads}
            onRowClick={setSelectedLoad}
          />
        }
        map={
          <DriverMap
            routes={transitRoutes}
            selectedRouteId={
              selectedLoad?.status === LOAD_STATUSES.InTransit ? selectedLoad._id : null
            }
            height="100%"
          />
        }
      />
    </PageShell>
  )
}
