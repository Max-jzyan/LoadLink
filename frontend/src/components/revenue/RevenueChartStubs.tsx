import DynamicCard from '@/components/layout/DynamicCard'
import { DistanceProfitScatterChart } from '@/components/revenue/charts/DistanceProfitScatterChart'
import { ExpenseBreakdownChart } from '@/components/revenue/charts/ExpenseBreakdownChart'
import { ProfitByRouteChart } from '@/components/revenue/charts/ProfitByRouteChart'
import { RevenueTimeChart } from '@/components/revenue/charts/RevenueTimeChart'
import type { LoadRevenue } from '@/services/driverApi/driverEnum'

interface RevenueChartStubsProps {
  loadBreakdown: LoadRevenue[]
}

export function RevenueChartGrid({ loadBreakdown }: RevenueChartStubsProps) {
  const charts = [
    {
      title: 'Revenue & Expenses Over Time',
      description: 'Weekly trends showing revenue vs expenses',
      component: <RevenueTimeChart loadBreakdown={loadBreakdown} />,
    },
    {
      title: 'Profit by Route',
      description: 'Top routes ranked by net profit',
      component: <ProfitByRouteChart loadBreakdown={loadBreakdown} maxRoutes={10} />,
    },
    {
      title: 'Expense Breakdown',
      description: 'Distribution of expenses by category',
      component: <ExpenseBreakdownChart loadBreakdown={loadBreakdown} />,
    },
    {
      title: 'Distance vs Profit',
      description: 'Profitability analysis by distance',
      component: <DistanceProfitScatterChart loadBreakdown={loadBreakdown} />,
    },
  ]

  return (
    <div className="space-y-4 w-full max-w-full">
      {/* Responsive grid: 1 column on mobile, 2 columns on md+ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-full">
        {charts.map((chart, index) => (
          <DynamicCard key={index} title={chart.title} description={chart.description} expand>
            {chart.component}
          </DynamicCard>
        ))}
      </div>
    </div>
  )
}