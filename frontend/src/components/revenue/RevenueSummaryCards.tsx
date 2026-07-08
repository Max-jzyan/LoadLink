import DynamicCard from '@/components/layout/DynamicCard'
import { DollarSign, Fuel, TrendingDown, TrendingUp } from 'lucide-react'
import type { RevenueSummary } from '@/services/driverApi/driverEnum'
import { formatCAD, cn } from '@/lib/utils'

export function RevenueSummaryCards({ revenue }: { revenue: RevenueSummary | null }) {
  const profitColor = revenue && revenue.netProfit >= 0 ? 'text-green-500' : 'text-red-500'
  const marginColor = revenue && revenue.profitMargin >= 0 ? 'text-green-500' : 'text-red-500'

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <DynamicCard title="Total Revenue" action={<DollarSign className="text-primary" />}>
        <p className="text-4xl font-bold">{revenue ? formatCAD(revenue.totalRevenue) : '—'}</p>
      </DynamicCard>
      <DynamicCard title="Total Expenses" action={<Fuel className="text-orange-500" />}>
        <p className="text-4xl font-bold">{revenue ? formatCAD(revenue.totalExpenses) : '—'}</p>
      </DynamicCard>
      <DynamicCard title="Net Profit" action={<TrendingUp className={profitColor} />}>
        <p className={cn('text-4xl font-bold', profitColor)}>{revenue ? formatCAD(revenue.netProfit) : '—'}</p>
      </DynamicCard>
      <DynamicCard title="Profit Margin" action={<TrendingDown className={marginColor} />}>
        <p className={cn('text-4xl font-bold', marginColor)}>{revenue ? `${revenue.profitMargin.toFixed(1)}%` : '—'}</p>
      </DynamicCard>
    </div>
  )
}
