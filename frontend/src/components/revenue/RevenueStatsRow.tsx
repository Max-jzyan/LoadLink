import type { DashboardViewMode, RevenueSummary } from '@/services/driverApi/driverEnum'
import { formatCAD, formatKm } from '@/lib/utils'

export function RevenueStatsRow({
  revenue,
  viewMode = 'completed',
}: {
  revenue: RevenueSummary | null
  viewMode?: DashboardViewMode
}) {
  if (!revenue) return null

  const isPotential = viewMode === 'potential'

  return (
    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
      <span>
        {isPotential ? 'Active Loads' : 'Completed Loads'}:{' '}
        <strong>{revenue.completedLoadsCount}</strong>
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
