import { useCallback } from 'react'
import { TooltipProvider } from '@/components/ui/tooltip'
import DynamicCard from '@/components/layout/DynamicCard'
import { DataTable, type DrawerField } from '@/components/shared/DataTable'
import { createColumns } from './revenueColumns'
import { DrawerExpenseForm } from './DrawerExpenseForm'
import CompanyNameLink from '@/components/shared/CompanyNameLink'
import type { DashboardViewMode, LoadRevenue } from '@/services/driverApi/driverEnum'
import { formatCAD } from '@/lib/utils'

export function RevenueTable({
  loadBreakdown,
  onPerLoadSaved,
  viewMode = 'completed',
}: {
  loadBreakdown: LoadRevenue[]
  onPerLoadSaved: () => void
  viewMode?: DashboardViewMode
}) {
  const isPotential = viewMode === 'potential'
  const columns = createColumns(onPerLoadSaved, viewMode)

  const drawerTitle = useCallback((load: LoadRevenue) => {
    return (
      <CompanyNameLink
        name={load.companyName?.toUpperCase() ?? ''}
        companyId={load.companyId}
        className="font-semibold"
      />
    )
  }, [])

  const drawerFields: DrawerField<LoadRevenue>[] = [
    {
      label: 'Date',
      renderValue: (load) => {
        const d = load.deliveryDate
        if (!d) return <span className="text-sm">—</span>
        return (
          <span className="text-sm">
            {new Date(d).toLocaleDateString('en-CA', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </span>
        )
      },
    },
    {
      label: 'Origin',
      renderValue: (load) => <span className="text-sm">{load.originAddress}</span>,
    },
    {
      label: 'Destination',
      renderValue: (load) => <span className="text-sm">{load.destinationAddress}</span>,
    },
    {
      label: 'Truck',
      renderValue: (load) => {
        if (!load.selectedTruckName) return <span className="text-sm text-muted-foreground">—</span>
        return <span className="text-sm">{load.selectedTruckName}</span>
      },
    },
    {
      label: 'Distance',
      renderValue: (load) => <span>{Math.round(load.distanceKm).toLocaleString()} km</span>,
    },
    {
      label: isPotential ? 'Expected Payout' : 'Payout',
      renderValue: (load) => <span className="font-semibold">{formatCAD(load.payout)}</span>,
    },
    {
      label: 'Fuel',
      renderValue: (load) => <span>{formatCAD(load.fuelCost)}</span>,
    },
    {
      label: isPotential ? 'Est. Maintenance' : 'Maintenance',
      renderValue: (load) => <span>{formatCAD(load.maintenanceCost)}</span>,
    },
    {
      label: isPotential ? 'Expected Profit' : 'Net Profit',
      renderValue: (load) => {
        const val = load.netProfit
        return (
          <span
            className={val >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}
          >
            {formatCAD(val)}
          </span>
        )
      },
    },
  ]

  const drawerFooter = useCallback(
    (load: LoadRevenue, helpers: { onClose: () => void }) => (
      <DrawerExpenseForm
        load={load}
        onClose={() => {
          onPerLoadSaved()
          helpers.onClose()
        }}
      />
    ),
    [onPerLoadSaved]
  )

  return (
    <DynamicCard title={isPotential ? 'Active Loads Breakdown' : 'Per-Load Breakdown'} expand>
      {loadBreakdown.length > 0 ? (
        <TooltipProvider>
          <DataTable
            columns={columns}
            data={loadBreakdown}
            drawerTitle={drawerTitle}
            drawerFields={drawerFields}
            drawerFooter={drawerFooter}
          />
        </TooltipProvider>
      ) : (
        <div className="flex h-32 items-center justify-center text-muted-foreground">
          {isPotential
            ? 'No active loads yet. Book a load to see potential revenue.'
            : 'No completed loads yet. Complete a load to see your revenue breakdown.'}
        </div>
      )}
    </DynamicCard>
  )
}
