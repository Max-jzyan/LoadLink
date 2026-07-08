import DynamicCard from '@/components/layout/DynamicCard'
import { DollarSign, Fuel, TrendingDown, TrendingUp } from 'lucide-react'
import type { RevenueSummary } from '@/services/driverApi/driverEnum'
import { cn } from '@/lib/utils'
import { useAnimatedCurrency, useAnimatedPercentage } from '@/hooks/useAnimatedNumber'

export function RevenueSummaryCards({ revenue }: { revenue: RevenueSummary | null }) {
  const profitColor = revenue && revenue.netProfit >= 0 ? 'text-green-500' : 'text-red-500'
  const marginColor = revenue && revenue.profitMargin >= 0 ? 'text-green-500' : 'text-red-500'
  const ProfitIcon = revenue && revenue.netProfit >= 0 ? TrendingUp : TrendingDown
  const MarginIcon = revenue && revenue.profitMargin >= 0 ? TrendingUp : TrendingDown

  const animatedRevenue = useAnimatedCurrency(revenue?.totalRevenue)
  const animatedExpenses = useAnimatedCurrency(revenue?.totalExpenses)
  const animatedProfit = useAnimatedCurrency(revenue?.netProfit)
  const animatedMargin = useAnimatedPercentage(revenue?.profitMargin)

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <DynamicCard title="Total Revenue" action={<DollarSign className="text-primary" />}>
        <p className="text-4xl font-bold">{animatedRevenue}</p>
      </DynamicCard>
      <DynamicCard title="Total Expenses" action={<Fuel className="text-orange-500" />}>
        <p className="text-4xl font-bold">{animatedExpenses}</p>
      </DynamicCard>
      <DynamicCard title="Net Profit" action={<ProfitIcon className={profitColor} />}>
        <p className={cn('text-4xl font-bold', profitColor)}>{animatedProfit}</p>
      </DynamicCard>
      <DynamicCard title="Profit Margin" action={<MarginIcon className={marginColor} />}>
        <p className={cn('text-4xl font-bold', marginColor)}>{animatedMargin}</p>
      </DynamicCard>
    </div>
  )
}
