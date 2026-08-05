import CompanyLoadFilterBar, {
  type CompanyLoadFilters,
  DEFAULT_FILTERS,
} from '@/components/companyLoads/CompanyLoadFilterBar'
import CompanyLoadTable from '@/components/companyLoads/companyLoadTable'
import { CompanySpendCards } from '@/components/companyRevenue/CompanySpendCards'
import { SpendByRouteChart } from '@/components/companyRevenue/SpendByRouteChart'
import { SpendTimeChart } from '@/components/companyRevenue/SpendTimeChart'
import { DriverMap } from '@/components/driverLoads/Map'
import DynamicCard from '@/components/layout/DynamicCard'
import LoadsPageLayout from '@/components/layout/LoadsPageLayout'
import PageShell from '@/components/layout/PageShell'
import { Button } from '@/components/ui/button'
import { RoutePath } from '@/config/routes'
import useAuth, { useRequiredMongoId } from '@/hooks/useAuth'
import { useRefreshTimestamp } from '@/hooks/useRefreshTimestamp'
import { deriveSpendLoads, summarizeSpend } from '@/lib/companySpend'
import { useGetCompanyDashboardQuery } from '@/services/companyApi/companyApi'
import { ACTIVE_STATUSES, HISTORICAL_STATUSES } from '@/types/enums'
import { Hammer, Package2, Plus, RefreshCw, TrendingUp, Truck } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { Link } from 'react-router-dom'
import { relativeTime } from '@/lib/utils'

type DashboardTab = 'overview' | 'spending'

export default function CompanyDashboard() {
  const { user } = useAuth()
  const companyName = user?.email?.split('@')[0] ?? null
  const companyId = useRequiredMongoId()
  const [tab, setTab] = useState<DashboardTab>('overview')

  const {
    data: dashboard,
    isLoading: dashLoading,
    isFetching,
    refetch,
    fulfilledTimeStamp,
  } = useGetCompanyDashboardQuery(companyId, {
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

  const [selectedLoadId, setSelectedLoadId] = useState<string | null>(null)
  const handleResetView = useCallback(() => setSelectedLoadId(null), [])
  const [filters, setFilters] = useState<CompanyLoadFilters>(DEFAULT_FILTERS)
  const debouncedOrigin = useDebouncedValue(filters.origin, 400)
  const debouncedDestination = useDebouncedValue(filters.destination, 400)


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

    // Origin / destination substring filters (case-insensitive)
    const origin = debouncedOrigin.trim().toLowerCase()
    if (origin) {
      result = result.filter((l) => l.originAddress.toLowerCase().includes(origin))
    }
    const destination = debouncedDestination.trim().toLowerCase()
    if (destination) {
      result = result.filter((l) => l.destinationAddress.toLowerCase().includes(destination))
    }

    return result
  }, [
    loads,
    filters.loadStatus,
    filters.dateRange,
    debouncedOrigin,
    debouncedDestination,
  ])

  // Map all loads to the shape DriverMap expects; the map component handles focusing
  const transitRoutes = useMemo(() => {
    return loads.map((l) => ({
      id: l._id,
      origin: [l.originCoords.lat, l.originCoords.lng] as [number, number],
      originName: l.originAddress,
      destination: [l.destinationCoords.lat, l.destinationCoords.lng] as [number, number],
      destinationName: l.destinationAddress,
      status: l.status,
      polyline: l.route?.polyline,
    }))
  }, [loads])

  // Spend analytics derived from auction prices on completed/booked/in-transit loads
  const spendLoads = useMemo(() => deriveSpendLoads(loads), [loads])
  const spendSummary = useMemo(() => summarizeSpend(spendLoads), [spendLoads])

  const handleTabChange = useCallback((value: string) => {
    if (value === 'overview' || value === 'spending') {
      setTab(value)
    }
  }, [])

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
      title="Company Dashboard"
      subtitle={subtitle}
      tabs={{
        options: [
          { value: 'overview', label: 'Overview' },
          { value: 'spending', label: 'Spending Analytics' },
        ],
        value: tab,
        onValueChange: handleTabChange,
        searchParamKey: 'tab',
      }}
      stickyBar={
        tab === 'overview' ? (
          <CompanyLoadFilterBar filters={filters} onFiltersChange={setFilters} />
        ) : undefined
      }
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
      {tab === 'overview' ? (
        <LoadsPageLayout
          isLoading={isLoading}
          statsCards={statsCards}
          mapHeight={600}
          table={
            <CompanyLoadTable
              title={isLoading ? 'Loading...' : 'Loads'}
              loads={filteredLoads}
              onRowClick={(load) => setSelectedLoadId(load._id)}
              selectedId={selectedLoadId}
            />
          }
          map={<DriverMap routes={transitRoutes} selectedRouteId={selectedLoadId} height="100%" />}
          mapAction={
            selectedLoadId ? (
              <Button variant="ghost" size="sm" onClick={handleResetView}>
                Reset View
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-6">
          <CompanySpendCards summary={spendSummary} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-full">
            <DynamicCard
              title="Spend Over Time"
              description="Weekly totals — money spent on completed loads vs committed to active loads"
              expand
            >
              <SpendTimeChart spendLoads={spendLoads} />
            </DynamicCard>
            <DynamicCard
              title="Spend by Route"
              description="Top routes ranked by total auction spend"
              expand
            >
              <SpendByRouteChart spendLoads={spendLoads} />
            </DynamicCard>
          </div>
        </div>
      )}
    </PageShell>
  )
}
