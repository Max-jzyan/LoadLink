import { useEffect, useState } from 'react'
import { Info, Pencil } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { useUpdateLoadExpensesMutation } from '@/services/loadApi/loadSlice'
import type { DashboardViewMode, LoadRevenue, ExpenseOverrideFields } from '@/services/driverApi/driverEnum'
import type { ColumnDef } from '@tanstack/react-table'
import { formatCAD, cn } from '@/lib/utils'

// ── Per-load expense dialog component ────────────────────────────────────

const perLoadFields: { key: keyof ExpenseOverrideFields; label: string; suffix: string; step: number; isMonetary?: boolean }[] = [
  { key: 'fuelCostPerLiter', label: 'Fuel Cost', suffix: 'per L', step: 0.01, isMonetary: true },
  { key: 'fuelEfficiencyKmPerLiter', label: 'Fuel Efficiency', suffix: 'km/L', step: 0.1 },
  { key: 'maintenancePerKm', label: 'Maintenance', suffix: 'per km', step: 0.01, isMonetary: true },
]

function PerLoadExpenseDialog({
  load,
  onSaved,
  trigger,
}: {
  load: LoadRevenue
  onSaved: () => void
  trigger: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [updateExpenses, { isLoading }] = useUpdateLoadExpensesMutation()

  const [form, setForm] = useState<ExpenseOverrideFields>({})

  useEffect(() => {
    if (open) {
      setForm({
        fuelCostPerLiter: load.effectiveFuelCostPerLiter ?? null,
        fuelEfficiencyKmPerLiter: load.effectiveFuelEfficiencyKmPerLiter ?? null,
        maintenancePerKm: load.effectiveMaintenancePerKm ?? null,
      })
    }
  }, [open, load])

  const handleChange = (key: keyof ExpenseOverrideFields, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value === '' ? null : parseFloat(value) || 0 }))
  }

  const handleClear = async () => {
    await updateExpenses({
      loadId: load.loadId,
      body: { fuelCostPerLiter: null, fuelEfficiencyKmPerLiter: null, maintenancePerKm: null },
    }).unwrap()
    setOpen(false)
    onSaved()
  }

  const handleSave = async () => {
    await updateExpenses({ loadId: load.loadId, body: form }).unwrap()
    setOpen(false)
    onSaved()
  }

  return (
    <>
      <div onClick={() => setOpen(true)}>{trigger}</div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Override Load Expenses</DialogTitle>
            <DialogDescription>
              Set custom expense assumptions for this specific load. Leave empty to use global defaults.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {perLoadFields.map(({ key, label, suffix, step, isMonetary }) => (
              <Field key={key}>
                <FieldLabel>
                  {label} ({suffix})
                </FieldLabel>
                <div className="relative">
                  {isMonetary && (
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  )}
                  <Input
                    type="number"
                    step={step}
                    min={0}
                    placeholder="Use global default"
                    value={form[key] ?? ''}
                    onChange={(e) => handleChange(key, e.target.value)}
                    className={cn(isMonetary && 'pl-7')}
                  />
                </div>
                <FieldDescription>
                  {isMonetary ? 'Dollar amount' : 'Leave blank to use your global default'}
                </FieldDescription>
              </Field>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleClear} disabled={isLoading}>
              Clear Overrides
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

const statusBadgeVariant: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  booked: 'secondary',
  in_transit: 'default',
}

const statusLabel: Record<string, string> = {
  booked: 'Booked',
  in_transit: 'In Transit',
}

// ── Column definitions ───────────────────────────────────────────────────

export function createColumns(onPerLoadSaved: () => void, viewMode: DashboardViewMode = 'completed'): ColumnDef<LoadRevenue>[] {
  const isPotential = viewMode === 'potential'

  const columns: ColumnDef<LoadRevenue>[] = [
    {
      accessorKey: 'deliveryDate',
      header: isPotential ? 'Est. Delivery' : 'Date',
      cell: ({ row }) => {
        const d = row.original.deliveryDate
        if (!d) return '—'
        return new Date(d).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' })
      },
      meta: { headerClassName: 'hidden lg:table-cell', cellClassName: 'hidden lg:table-cell text-muted-foreground' },
    },
    {
      accessorKey: 'originAddress',
      header: 'Origin',
      meta: { headerClassName: 'hidden md:table-cell', cellClassName: 'hidden md:table-cell' },
    },
    {
      accessorKey: 'destinationAddress',
      header: 'Destination',
      meta: { headerClassName: 'hidden md:table-cell', cellClassName: 'hidden md:table-cell' },
    },
  ]

  // Status column only in potential revenue mode
  if (isPotential) {
    columns.push({
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const s = row.original.status ?? ''
        return (
          <Badge variant={statusBadgeVariant[s] ?? 'outline'}>
            {statusLabel[s] ?? s}
          </Badge>
        )
      },
      meta: { headerClassName: 'text-center', cellClassName: 'text-center' },
    })
  }

  columns.push(
    {
      accessorKey: 'distanceKm',
      header: 'Distance',
      cell: ({ row }) => `${Math.round(row.original.distanceKm).toLocaleString()} km`,
      meta: { headerClassName: 'text-right', cellClassName: 'text-right' },
    },
    {
      accessorKey: 'payout',
      header: isPotential ? 'Expected Payout' : 'Payout',
      cell: ({ row }) => formatCAD(row.original.payout),
      meta: { headerClassName: 'text-right', cellClassName: 'text-right font-medium' },
    },
    {
      accessorKey: 'fuelCost',
      header: 'Fuel',
      cell: ({ row }) => formatCAD(row.original.fuelCost),
      meta: { headerClassName: 'text-right hidden md:table-cell', cellClassName: 'text-right hidden md:table-cell' },
    },
    {
      accessorKey: 'totalExpenses',
      header: isPotential ? 'Est. Expenses' : 'Expenses',
      cell: ({ row }) => formatCAD(row.original.totalExpenses),
      meta: { headerClassName: 'text-right hidden sm:table-cell', cellClassName: 'text-right hidden sm:table-cell' },
    },
    {
      accessorKey: 'netProfit',
      header: isPotential ? 'Expected Profit' : 'Net Profit',
      cell: ({ row }) => {
        const val = row.original.netProfit
        return (
          <span className={val >= 0 ? 'text-green-600' : 'text-red-600'}>
            {formatCAD(val)}
          </span>
        )
      },
      meta: { headerClassName: 'text-right', cellClassName: 'text-right font-semibold' },
    },
    {
      id: 'assumptions',
      header: '',
      cell: ({ row }) => {
        const lr = row.original
        const tooltipContent = (
          <div className="space-y-1 text-xs">
            <p>Fuel: {formatCAD(lr.effectiveFuelCostPerLiter)}/L @ {lr.effectiveFuelEfficiencyKmPerLiter} km/L</p>
            <p>Maintenance: {formatCAD(lr.effectiveMaintenancePerKm)}/km</p>
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
      meta: { headerClassName: 'w-10', cellClassName: 'w-10' },
    },
  )

  // Edit column only for completed mode (per-load expense overrides make sense only for actual data)
  if (!isPotential) {
    columns.push({
      id: 'edit',
      header: '',
      cell: ({ row }) => (
        <PerLoadExpenseDialog load={row.original} onSaved={onPerLoadSaved} trigger={
          <Button variant="ghost" size="icon" className="h-7 w-7" title="Edit load expenses">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        } />
      ),
      meta: { headerClassName: 'w-10', cellClassName: 'w-10' },
    })
  }

  return columns
}
