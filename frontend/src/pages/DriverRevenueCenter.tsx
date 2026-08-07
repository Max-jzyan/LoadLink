import PageShell from '@/components/layout/PageShell'
import Spinner from '@/components/shared/Spinner'
import { GlobalExpenseDrawer } from '@/components/revenue/GlobalExpenseDrawer'
import { RevenueChartGrid } from '@/components/revenue/RevenueChartStubs'
import RevenueFilterBar from '@/components/revenue/RevenueFilterBar'
import { RevenueStatsRow } from '@/components/revenue/RevenueStatsRow'
import { RevenueSummaryCards } from '@/components/revenue/RevenueSummaryCards'
import { RevenueTable } from '@/components/revenue/RevenueTable'
import { Button } from '@/components/ui/button'
import { useRequiredMongoId } from '@/hooks/useAuth'
import { useDriverExpiryBanner } from '@/hooks/useDriverExpiryBanner'
import { useRefreshTimestamp } from '@/hooks/useRefreshTimestamp'
import { RoutePath } from '@/config/routes'
import { relativeTime } from '@/lib/utils'
import type {
  DashboardViewMode,
  ExpensePreferences,
  RevenueFilters,
  RevenueFiltersQuery,
} from '@/services/driverApi/driverEnum'
import {
  useGetDriverRevenueQuery,
  useListDriverTrucksQuery,
  useUpdateDriverExpensesMutation,
  useUpdateTruckExpensesMutation,
} from '@/services/driverApi/driverSlice'
import { RefreshCw, Settings2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useNavigate } from 'react-router-dom'

export default function DriverRevenueCenter() {
  const driverId = useRequiredMongoId()
  const navigate = useNavigate()
  const expiryBanner = useDriverExpiryBanner({
    driverId,
    onUpdateClick: () => navigate(RoutePath.DriverProfile),
  })
  const [viewMode, setViewMode] = useState<DashboardViewMode>('completed')

  const [filters, setFilters] = useState<RevenueFilters>({
    dateRange: {
      from: undefined,
      to: undefined,
    },
    truckType: '',
    selectedTruck: '',
    minPayout: null,
    maxPayout: null,
    origin: '',
    destination: '',
    minDistance: null,
    maxDistance: null,
  })

  // Debounce only text/number inputs; date/truck/view-mode stay instant.
  // Pass viewMode as a dependency so changing tabs flushes the debounce immediately.
  const debouncedOrigin = useDebouncedValue(filters.origin, 400, [viewMode])
  const debouncedDestination = useDebouncedValue(filters.destination, 400, [viewMode])
  const debouncedMinPayout = useDebouncedValue(filters.minPayout, 400, [viewMode])
  const debouncedMaxPayout = useDebouncedValue(filters.maxPayout, 400, [viewMode])
  const debouncedMinDistance = useDebouncedValue(filters.minDistance, 400, [viewMode])
  const debouncedMaxDistance = useDebouncedValue(filters.maxDistance, 400, [viewMode])

  const {
    data: revenue = null,
    isFetching,
    refetch,
    fulfilledTimeStamp,
  } = useGetDriverRevenueQuery({
    driverId,
      filters: {
        origin: debouncedOrigin,
        destination: debouncedDestination,
        minPayout: debouncedMinPayout,
        maxPayout: debouncedMaxPayout,
        minDistance: debouncedMinDistance,
        maxDistance: debouncedMaxDistance,
        status: viewMode === 'potential' ? 'booked,in_transit' : 'completed',
        dateRange: {
          from: filters.dateRange?.from ? filters.dateRange.from.toISOString() : undefined,
          to: filters.dateRange?.to ? filters.dateRange.to.toISOString() : undefined,
        },
        truckType: filters.truckType,
        selectedTruck: filters.selectedTruck,
      } as RevenueFiltersQuery,
  })

  const [updateExpenses, { isLoading: isUpdating, isSuccess: isGlobalExpensesSuccess }] =
    useUpdateDriverExpensesMutation()
  const [updateTruckExpenses, { isLoading: isUpdatingTruck, isSuccess: isTruckExpensesSuccess }] =
    useUpdateTruckExpensesMutation()
  const { data: trucks = [] } = useListDriverTrucksQuery(driverId)

  const [localExpenses, setLocalExpenses] = useState<ExpensePreferences | null>(null)
  const [globalDrawerOpen, setGlobalDrawerOpen] = useState(false)

  useEffect(() => {
    if (revenue?.expensePreferences) {
      setLocalExpenses(revenue.expensePreferences)
    }
  }, [revenue?.expensePreferences])

  useEffect(() => {
    if (isGlobalExpensesSuccess || isTruckExpensesSuccess) {
      setGlobalDrawerOpen(false)
    }
  }, [isGlobalExpensesSuccess, isTruckExpensesSuccess])

  const handleSaveExpenses = useCallback(
    (form: ExpensePreferences, scope: string) => {
      if (scope === 'global') {
        updateExpenses({ driverId, body: form })
      } else {
        updateTruckExpenses({
          driverId,
          truckId: scope,
          body: form,
        })
      }
    },
    [driverId, updateExpenses, updateTruckExpenses]
  )

  const handleDrawerOpenChange = useCallback((open: boolean) => {
    setGlobalDrawerOpen(open)
  }, [])

  const { lastManualRefresh, handleRefresh, captureInitialLoad } = useRefreshTimestamp()
  useEffect(() => {
    captureInitialLoad(fulfilledTimeStamp)
  }, [fulfilledTimeStamp, captureInitialLoad])

  const onRefresh = useCallback(() => handleRefresh(refetch), [handleRefresh, refetch])
  const subtitle = lastManualRefresh ? `Updated ${relativeTime(lastManualRefresh)}` : undefined

  const handleViewModeChange = useCallback((value: string) => {
    if (value === 'completed' || value === 'potential') {
      setViewMode(value)
    }
  }, [])

  const handlePerLoadSaved = useCallback(() => {
    refetch()
  }, [refetch])

  if (!revenue) {
    return (
      <PageShell title="Revenue Center" subtitle={subtitle}>
        <Spinner fullPage />
      </PageShell>
    )
  }

  return (
    <PageShell
      title="Revenue Center"
      subtitle={subtitle}
      banner={expiryBanner}
      tabs={{
        options: [
          { value: 'completed', label: 'Completed' },
          { value: 'potential', label: 'Potential Revenue' },
        ],
        value: viewMode,
        onValueChange: handleViewModeChange,
        searchParamKey: 'tab',
      }}
      stickyBar={
        <RevenueFilterBar filters={filters} onFiltersChange={setFilters} trucks={trucks} />
      }
      actions={
        <>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setGlobalDrawerOpen(true)}
            title="Expense Settings"
            data-tour="expense-settings"
          >
            <Settings2 />
          </Button>
          <Button variant="outline" size="icon" onClick={onRefresh} title="Refresh">
            <RefreshCw className={isFetching ? 'animate-spin' : ''} />
          </Button>
        </>
      }
    >
      <GlobalExpenseDrawer
        open={globalDrawerOpen}
        onOpenChange={handleDrawerOpenChange}
        localExpenses={localExpenses}
        onSave={handleSaveExpenses}
        isSaving={isUpdating || isUpdatingTruck}
        trucks={trucks}
      />

      <div className="space-y-6">
        <div data-tour="revenue-summary">
          <RevenueSummaryCards revenue={revenue} viewMode={viewMode} />
        </div>

        <div data-tour="revenue-stats">
          <RevenueStatsRow revenue={revenue} viewMode={viewMode} />
        </div>

        <div data-tour="revenue-charts">
          <RevenueChartGrid loadBreakdown={revenue.loadBreakdown ?? []} viewMode={viewMode} />
        </div>

        <div data-tour="revenue-table">
          <RevenueTable
            loadBreakdown={revenue.loadBreakdown ?? []}
            onPerLoadSaved={handlePerLoadSaved}
            viewMode={viewMode}
          />
        </div>
      </div>
    </PageShell>
  )
}
