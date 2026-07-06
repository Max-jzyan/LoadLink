import type { RevenueSummary } from '@/services/driverApi/driverEnum'
import { formatCAD, formatKm } from '@/lib/utils'

export function RevenueStatsRow({ revenue }: { revenue: RevenueSummary | null }) {
  if (!revenue) return null

  return (
    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
      <span>
        Completed Loads: <strong>{revenue.completedLoadsCount}</strong>
      </span>
      <span>
        Total Distance: <strong>{formatKm(revenue.totalDistanceKm)}</strong>
      </span>
      <span>
        Monthly Fixed Costs: <strong>{formatCAD(revenue.monthlyFixedCosts)}</strong>
      </span>
    </div>
  )
}