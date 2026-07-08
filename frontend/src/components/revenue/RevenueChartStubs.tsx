import DynamicCard from '@/components/layout/DynamicCard'
import { DistanceProfitScatterChart } from '@/components/revenue/charts/DistanceProfitScatterChart'
import { ExpenseBreakdownChart } from '@/components/revenue/charts/ExpenseBreakdownChart'
import { ProfitByRouteChart } from '@/components/revenue/charts/ProfitByRouteChart'
import { RevenueTimeChart } from '@/components/revenue/charts/RevenueTimeChart'
import type { DashboardViewMode, LoadRevenue } from '@/services/driverApi/driverEnum'

interface RevenueChartStubsProps {
  loadBreakdown: LoadRevenue[]
  viewMode?: DashboardViewMode
}

export function RevenueChartGrid({ loadBreakdown, viewMode = 'completed' }: RevenueChartStubsProps) {
  const isPotential = viewMode === 'potential'

  const charts = [
    {
      title: isPotential ? 'Expected Revenue & Expenses Over Time' : 'Revenue & Expenses Over Time',
      description: isPotential ? 'Weekly trends showing expected revenue vs estimated expenses' : 'Weekly trends showing revenue vs expenses',
      component: <RevenueTimeChart loadBreakdown={loadBreakdown} viewMode={viewMode} />,
    },
    {
      title: isPotential ? 'Expected Profit by Route' : 'Profit by Route',
      description: isPotential ? 'Top routes ranked by expected net profit' : 'Top routes ranked by net profit',
      component: <ProfitByRouteChart loadBreakdown={loadBreakdown} maxRoutes={10} viewMode={viewMode} />,
    },
    {
      title: isPotential ? 'Estimated Expense Breakdown' : 'Expense Breakdown',
      description: isPotential ? 'Distribution of estimated expenses by category' : 'Distribution of expenses by category',
      component: <ExpenseBreakdownChart loadBreakdown={loadBreakdown} viewMode={viewMode} />,
    },
    {
      title: isPotential ? 'Distance vs Expected Profit' : 'Distance vs Profit',
      description: isPotential ? 'Expected profitability analysis by distance' : 'Profitability analysis by distance',
      component: <DistanceProfitScatterChart loadBreakdown={loadBreakdown} viewMode={viewMode} />,
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