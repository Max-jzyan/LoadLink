import { useMemo, useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { InfoIconPopover } from '@/components/shared/InfoIconPopover'
import DynamicCard from '@/components/layout/DynamicCard'
import type { Load, Truck } from '@/services/driverApi/driverEnum'
import { DollarSign, TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProfitLossCardProps {
  load: Load
  distanceKm: number
  bidPrice: number
  trucks: Truck[]
  priceLabel?: string
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
  }).format(amount)
}

export function ProfitLossCard({
  load,
  distanceKm,
  bidPrice,
  trucks,
  priceLabel,
}: ProfitLossCardProps) {
  const [selectedTruckId, setSelectedTruckId] = useState<string | null>(
    () => trucks.find((t) => t.isPrimary)?._id || trucks[0]?._id || null
  )

  const selectedTruck = trucks.find((t) => t._id === selectedTruckId) || null

  const calc = useMemo(() => {
    if (!selectedTruck) return null

    const prefs = selectedTruck.expensePreferences
    const fuelCost =
      prefs.fuelEfficiencyKmPerLiter &&
      prefs.fuelEfficiencyKmPerLiter > 0 &&
      prefs.fuelCostPerLiter != null
        ? (distanceKm / prefs.fuelEfficiencyKmPerLiter) * prefs.fuelCostPerLiter
        : 0
    const maintenance = prefs.maintenancePerKm != null ? distanceKm * prefs.maintenancePerKm : 0

    const pickupMs = new Date(load.pickupTime).getTime()
    const dropoffMs = new Date(load.dropoffTime).getTime()
    const loadDaysMs = Math.max(0, dropoffMs - pickupMs)
    const loadDays = Math.max(1, loadDaysMs / (1000 * 60 * 60 * 24))
    const monthFraction = loadDays / 30

    const insurance = prefs.insurancePerMonth > 0 ? prefs.insurancePerMonth * monthFraction : 0
    const otherFixed =
      prefs.otherFixedCostsPerMonth != null ? prefs.otherFixedCostsPerMonth * monthFraction : 0
    const totalExpenses = fuelCost + maintenance + insurance + otherFixed
    const profit = bidPrice - totalExpenses
    const margin = bidPrice > 0 ? (profit / bidPrice) * 100 : 0

    return {
      revenue: bidPrice,
      fuelCost,
      maintenance,
      insurance,
      otherFixed,
      totalExpenses,
      profit,
      margin,
      isProfit: profit >= 0,
    }
  }, [selectedTruck, distanceKm, bidPrice, load.pickupTime, load.dropoffTime])

  if (trucks.length === 0 || !calc) {
    return (
      <DynamicCard
        title={
          <span className="flex items-center gap-1">
            Profit / Loss Estimate
            <InfoIconPopover
              title="Profit / Loss Estimate"
              description="Select a truck to see estimated revenue, expenses, and net profit for this load."
              iconClassName="w-5 h-5 text-gray-500 hover:text-gray-700 cursor-help"
            />
          </span>
        }
        noBorder
        size="sm"
        titleClassName="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
      >
        <p className="text-xs text-muted-foreground">
          No trucks available — add a truck in your profile.
        </p>
      </DynamicCard>
    )
  }

  return (
    <DynamicCard
      title={
        <span className="flex items-center gap-1">
          Profit / Loss Estimate
          <InfoIconPopover
            title="Profit / Loss Estimate"
            description="Estimated profit based on your bid price and selected truck's expense assumptions."
            iconClassName="w-5 h-5 text-gray-500 hover:text-gray-700 cursor-help"
          />
        </span>
      }
      noBorder
      size="sm"
      titleClassName="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
    >
      <div className="space-y-2">
        {priceLabel && (
          <p className="text-[11px] font-medium text-muted-foreground bg-muted/60 rounded-md px-2 py-1">
            {priceLabel}
          </p>
        )}
        {/* Truck selector */}
        <div className="flex items-center gap-2">
          <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider shrink-0">
            Truck
          </label>
          <Select
            value={selectedTruckId ?? undefined}
            onValueChange={(val) => setSelectedTruckId(val === 'none' ? null : val)}
          >
            <SelectTrigger className="h-8 text-xs flex-1">
              <SelectValue placeholder="Select truck" />
            </SelectTrigger>
            <SelectContent>
              {trucks.map((t) => (
                <SelectItem key={t._id} value={t._id} className="text-xs">
                  {t.year} {t.make} {t.model} ({t.truckType})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Revenue */}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <DollarSign className="h-3 w-3" />
            Revenue
          </span>
          <span className="text-xs font-medium">{formatCurrency(calc.revenue)}</span>
        </div>

        {/* Expenses */}
        <div className="space-y-0.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">Fuel</span>
            <span className="text-[11px] tabular-nums">{formatCurrency(calc.fuelCost)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">Maintenance</span>
            <span className="text-[11px] tabular-nums">{formatCurrency(calc.maintenance)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">Insurance (prorated)</span>
            <span className="text-[11px] tabular-nums">{formatCurrency(calc.insurance)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">Other fixed (prorated)</span>
            <span className="text-[11px] tabular-nums">{formatCurrency(calc.otherFixed)}</span>
          </div>
        </div>

        <div className="border-t pt-1.5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Estimated expenses</span>
            <span className="text-xs font-medium">{formatCurrency(calc.totalExpenses)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span
              className={cn(
                'flex items-center gap-1 text-sm font-semibold',
                calc.isProfit
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              )}
            >
              {calc.isProfit ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              {calc.isProfit ? 'Estimated profit' : 'Estimated loss'}
            </span>
            <span
              className={cn(
                'text-sm font-semibold tabular-nums',
                calc.isProfit
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              )}
            >
              {formatCurrency(Math.abs(calc.profit))}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">Estimated Margin</span>
            <span
              className={cn(
                'text-[11px] font-medium tabular-nums',
                calc.isProfit
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              )}
            >
              {calc.margin.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </DynamicCard>
  )
}
