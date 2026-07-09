import DynamicCard from '@/components/layout/DynamicCard'
import { useAnimatedCurrency } from '@/hooks/useAnimatedNumber'
import type { SpendSummary } from '@/lib/companySpend'
import { DollarSign, Package2, Route, Timer } from 'lucide-react'

/**
 * Headline spend metrics for the company dashboard — mirrors the driver
 * Revenue Center summary cards.
 */
export function CompanySpendCards({ summary }: { summary: SpendSummary | null }) {
  const animatedSpend = useAnimatedCurrency(summary?.totalSpend)
  const animatedCommitted = useAnimatedCurrency(summary?.committedSpend)
  const animatedPerLoad = useAnimatedCurrency(summary?.avgCostPerLoad)

  const perKm =
    summary && summary.avgCostPerKm > 0 ? `$${summary.avgCostPerKm.toFixed(2)}` : '$0.00'

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <DynamicCard title="Total Spend" action={<DollarSign className="text-primary" />}>
        <p className="text-4xl font-bold">{animatedSpend}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {summary?.completedCount ?? 0} completed load{summary?.completedCount === 1 ? '' : 's'}
        </p>
      </DynamicCard>
      <DynamicCard title="Committed Spend" action={<Timer className="text-amber-500" />}>
        <p className="text-4xl font-bold">{animatedCommitted}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {summary?.committedCount ?? 0} booked or in-transit load
          {summary?.committedCount === 1 ? '' : 's'}
        </p>
      </DynamicCard>
      <DynamicCard title="Avg Cost per Load" action={<Package2 className="text-green-500" />}>
        <p className="text-4xl font-bold">{animatedPerLoad}</p>
        <p className="text-xs text-muted-foreground mt-1">Across completed loads</p>
      </DynamicCard>
      <DynamicCard title="Avg Cost per km" action={<Route className="text-violet-500" />}>
        <p className="text-4xl font-bold">{perKm}</p>
        <p className="text-xs text-muted-foreground mt-1">Completed loads with route data</p>
      </DynamicCard>
    </div>
  )
}
