import { useCallback, useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { RefreshCw, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import PageShell from '@/components/layout/PageShell'
import { useRefreshTimestamp } from '@/hooks/useRefreshTimestamp'
import { selectMongoId } from '@/services/authSlice'
import {
  useGetDriverRevenueQuery,
  useUpdateDriverExpensesMutation,
} from '@/services/driverApi/driverSlice'
import type { ExpensePreferences, RevenueFilters, RevenueFiltersQuery } from '@/services/driverApi/driverEnum'
import { relativeTime } from '@/lib/utils'
import { RevenueSummaryCards } from '@/components/revenue/RevenueSummaryCards'
import { RevenueChartStubs } from '@/components/revenue/RevenueChartStubs'
import { RevenueStatsRow } from '@/components/revenue/RevenueStatsRow'
import { RevenueTable } from '@/components/revenue/RevenueTable'
import { GlobalExpenseDrawer } from '@/components/revenue/GlobalExpenseDrawer'
import RevenueFilterBar from '@/components/revenue/RevenueFilterBar'

export default function Dashboard() {
  const driverId = useSelector(selectMongoId)

  const [filters, setFilters] = useState<RevenueFilters>({
    dateRange: {
      from: undefined,
      to: undefined
    },
    truckType: '',
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

  const {
    data: revenue = null,
    isFetching,
    refetch,
    fulfilledTimeStamp,
  } = useGetDriverRevenueQuery(
    {
      driverId: driverId ?? '',
      filters: {
        ...debouncedFilters,
        dateRange: {
          from: debouncedFilters.dateRange?.from ? debouncedFilters.dateRange.from.toISOString() : undefined,
          to: debouncedFilters.dateRange?.to ? debouncedFilters.dateRange.to.toISOString() : undefined,
        }
      } as RevenueFiltersQuery
    },
    { skip: !driverId }
  )

  const [updateExpenses, { isLoading: isUpdating }] = useUpdateDriverExpensesMutation()

  const [localExpenses, setLocalExpenses] = useState<ExpensePreferences | null>(null)
  const [globalDrawerOpen, setGlobalDrawerOpen] = useState(false)

  useEffect(() => {
    if (revenue?.expensePreferences) {
      setLocalExpenses(revenue.expensePreferences)
    }
  }, [revenue?.expensePreferences])

  const handleSaveGlobalExpenses = useCallback(async (form: ExpensePreferences) => {
    if (!driverId) return
    try {
      await updateExpenses({ driverId, body: form }).unwrap()
      setGlobalDrawerOpen(false)
    } catch {
      // error handled by RTK
    }
  }, [driverId, updateExpenses])

  const { lastManualRefresh, handleRefresh, captureInitialLoad } = useRefreshTimestamp()
  useEffect(() => {
    captureInitialLoad(fulfilledTimeStamp)
  }, [fulfilledTimeStamp, captureInitialLoad])

  const onRefresh = useCallback(() => handleRefresh(refetch), [handleRefresh, refetch])
  const subtitle = lastManualRefresh ? `Updated ${relativeTime(lastManualRefresh)}` : undefined

  const handlePerLoadSaved = useCallback(() => {
    refetch()
  }, [refetch])

  return (
    <PageShell
      title="Revenue Center"
      subtitle={subtitle}
      stickyBar={<RevenueFilterBar filters={filters} onFiltersChange={setFilters} />}
      actions={
        <>
          <Button variant="outline" size="icon" onClick={() => setGlobalDrawerOpen(true)} title="Expense Settings">
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
        onOpenChange={setGlobalDrawerOpen}
        localExpenses={localExpenses}
        onSave={handleSaveGlobalExpenses}
        isSaving={isUpdating}
      />

      <div className="space-y-6">
        <RevenueSummaryCards revenue={revenue} />

        {revenue && <RevenueStatsRow revenue={revenue} />}

        <RevenueChartStubs />

        <RevenueTable
          loadBreakdown={revenue?.loadBreakdown ?? []}
          onPerLoadSaved={handlePerLoadSaved}
        />
      </div>
    </PageShell>
  )
}