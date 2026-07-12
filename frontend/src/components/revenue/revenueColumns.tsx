import { Info } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { DashboardViewMode, LoadRevenue } from '@/services/driverApi/driverEnum'
import type { ColumnDef } from '@tanstack/react-table'
import { formatCAD } from '@/lib/utils'
import { Pencil } from 'lucide-react'

const statusBadgeVariant: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  booked: 'secondary',
  in_transit: 'default',
}

const statusLabel: Record<string, string> = {
  booked: 'Booked',
  in_transit: 'In Transit',
}

// ── Column definitions ──────────────────────────────────────────────────────

export function createColumns(
  onPerLoadSaved: () => void,
  viewMode: DashboardViewMode = 'completed'
): ColumnDef<LoadRevenue>[] {
  const isPotential = viewMode === 'potential'

  const columns: ColumnDef<LoadRevenue>[] = [
    {
      accessorKey: 'deliveryDate',
      header: isPotential ? 'Est. Delivery' : 'Date',
      cell: ({ row }) => {
        const d = row.original.deliveryDate
        if (!d) return '—'
        return new Date(d).toLocaleDateString('en-CA', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      },
      meta: {
        responsive: 'xl',
      },
    },
    {
      accessorKey: 'originAddress',
      header: 'Origin',
      meta: { responsive: 'sm' },
    },
    {
      accessorKey: 'destinationAddress',
      header: 'Destination',
      meta: { responsive: 'sm' },
    },
    {
      id: 'truck',
      header: 'Truck',
      cell: ({ row }) => {
        const lr = row.original
        if (!lr.selectedTruckId || !lr.selectedTruckName) {
          return (
            <span className="text-sm text-muted-foreground" title="No truck assigned">
              —
            </span>
          )
        }
        return (
          <span className="text-sm" title={lr.selectedTruckName}>
            {lr.selectedTruckName}
          </span>
        )
      },
      meta: {
        responsive: 'lg',
      },
    },
  ]

  // Status column only in potential revenue mode
  if (isPotential) {
    columns.push({
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const s = row.original.status ?? ''
        return <Badge variant={statusBadgeVariant[s] ?? 'outline'}>{statusLabel[s] ?? s}</Badge>
      },
      meta: { responsive: 'lg' },
    })
  }

  columns.push(
    {
      accessorKey: 'distanceKm',
      header: 'Distance',
      cell: ({ row }) => `${Math.round(row.original.distanceKm).toLocaleString()} km`,
      meta: { responsive: 'md' },
    },
    {
      accessorKey: 'payout',
      header: isPotential ? 'Expected Payout' : 'Payout',
      cell: ({ row }) => formatCAD(row.original.payout),
      meta: { responsive: 'always' },
    },
    {
      accessorKey: 'fuelCost',
      header: 'Fuel',
      cell: ({ row }) => formatCAD(row.original.fuelCost),
      meta: { responsive: 'lg' },
    },
    {
      accessorKey: 'totalExpenses',
      header: isPotential ? 'Est. Expenses' : 'Expenses',
      cell: ({ row }) => formatCAD(row.original.totalExpenses),
      meta: { responsive: 'md' },
    },
    {
      accessorKey: 'netProfit',
      header: isPotential ? 'Expected Profit' : 'Net Profit',
      cell: ({ row }) => {
        const val = row.original.netProfit
        return (
          <span className={val >= 0 ? 'text-green-600' : 'text-red-600'}>{formatCAD(val)}</span>
        )
      },
      meta: { responsive: 'always' },
    },
    {
      id: 'assumptions',
      header: '',
      cell: ({ row }) => {
        const lr = row.original
        const tooltipContent = (
          <div className="space-y-1 text-xs">
            <p>
              Fuel: {formatCAD(lr.effectiveFuelCostPerLiter)}/L @{' '}
              {lr.effectiveFuelEfficiencyKmPerLiter} km/L
            </p>
            <p>Maintenance: {formatCAD(lr.effectiveMaintenancePerKm)}/km</p>
            {lr.effectiveInsurancePerMonth !== undefined && (
              <p>Insurance: {formatCAD(lr.effectiveInsurancePerMonth)}/month</p>
            )}
          </div>
        )
        return (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 cursor-help">
                  <Info className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-56">
                {tooltipContent}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
      },
      meta: { responsive: 'lg' },
    }
  )

  return columns
}