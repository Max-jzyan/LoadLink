import PageShell from '@/components/layout/PageShell'
import { GlobalExpenseDrawer } from '@/components/revenue/GlobalExpenseDrawer'
import { RevenueChartGrid } from '@/components/revenue/RevenueChartStubs'
import RevenueFilterBar from '@/components/revenue/RevenueFilterBar'
import { RevenueStatsRow } from '@/components/revenue/RevenueStatsRow'
import { RevenueSummaryCards } from '@/components/revenue/RevenueSummaryCards'
import { RevenueTable } from '@/components/revenue/RevenueTable'
import { Button } from '@/components/ui/button'
import { useRequiredMongoId } from '@/hooks/useAuth'
import { useRefreshTimestamp } from '@/hooks/useRefreshTimestamp'
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

export default function DriverRevenueCenter() {
  const driverId = useRequiredMongoId()
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

  const [debouncedFilters, setDebouncedFilters] = useState<RevenueFilters>(filters)

  // Debounce filter changes by 400ms to avoid excessive network calls
  useEffect(() => {
    const id = setTimeout(() => setDebouncedFilters(filters), 400)
    return () => clearTimeout(id)
  }, [filters])

  // Clear debounced filters on view mode switch
  useEffect(() => {
    setDebouncedFilters(filters)
  }, [filters, viewMode])

  const {
    data: revenue = null,
    isFetching,
    refetch,
    fulfilledTimeStamp,
  } = useGetDriverRevenueQuery({
    driverId,
    filters: {
      ...debouncedFilters,
      status: viewMode === 'potential' ? 'booked,in_transit' : 'completed',
      dateRange: {
        from: debouncedFilters.dateRange?.from
          ? debouncedFilters.dateRange.from.toISOString()
          : undefined,
        to: debouncedFilters.dateRange?.to
          ? debouncedFilters.dateRange.to.toISOString()
          : undefined,
      },
    } as RevenueFiltersQuery,
  })

  const [updateExpenses, { isLoading: isUpdating }] = useUpdateDriverExpensesMutation()
  const [updateTruckExpenses, { isLoading: isUpdatingTruck }] = useUpdateTruckExpensesMutation()
  const { data: trucks = [] } = useListDriverTrucksQuery(driverId)

  const [localExpenses, setLocalExpenses] = useState<ExpensePreferences | null>(null)
  const [globalDrawerOpen, setGlobalDrawerOpen] = useState(false)

  useEffect(() => {
    if (revenue?.expensePreferences) {
      setLocalExpenses(revenue.expensePreferences)
    }
  }, [revenue?.expensePreferences])

  const handleSaveExpenses = useCallback(
    async (form: ExpensePreferences, scope: string) => {
      try {
        if (scope === 'global') {
          await updateExpenses({ driverId, body: form }).unwrap()
        } else {
          await updateTruckExpenses({
            driverId,
            truckId: scope,
            body: form,
          }).unwrap()
        }
        setGlobalDrawerOpen(false)
      } catch {
        // error handled by RTK
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

  return (
    <PageShell
      title="Revenue Center"
      subtitle={subtitle}
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
        <RevenueSummaryCards revenue={revenue} viewMode={viewMode} />

        {revenue && <RevenueStatsRow revenue={revenue} viewMode={viewMode} />}

        <RevenueChartGrid loadBreakdown={revenue?.loadBreakdown ?? []} viewMode={viewMode} />

        <RevenueTable
          loadBreakdown={revenue?.loadBreakdown ?? []}
          onPerLoadSaved={handlePerLoadSaved}
          viewMode={viewMode}
        />
      </div>
    </PageShell>
  )
}
