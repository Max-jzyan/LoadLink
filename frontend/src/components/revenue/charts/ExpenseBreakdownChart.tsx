import { useMemo } from 'react'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { Pie, PieChart, Cell } from 'recharts'
import type { DashboardViewMode, LoadRevenue } from '@/services/driverApi/driverEnum'

interface ExpenseBreakdownChartProps {
  loadBreakdown: LoadRevenue[]
  viewMode?: DashboardViewMode
}

export function ExpenseBreakdownChart({ loadBreakdown }: ExpenseBreakdownChartProps) {
  const chartData = useMemo(() => {
    if (!loadBreakdown.length) return []

    // Aggregate expenses by category
    const totals = loadBreakdown.reduce(
      (acc, load) => {
        acc.fuel += load.fuelCost
        acc.maintenance += load.maintenanceCost
        acc.other += load.totalExpenses - load.fuelCost - load.maintenanceCost
        return acc
      },
      { fuel: 0, maintenance: 0, other: 0 }
    )

    return [
      { category: 'Fuel', value: totals.fuel, fill: 'var(--chart-1)' },
      { category: 'Misc', value: totals.maintenance, fill: 'var(--chart-2)' },
      { category: 'Other', value: totals.other, fill: 'var(--chart-3)' },
    ].filter((item) => item.value > 0)
  }, [loadBreakdown])

  const chartConfig = {
    Fuel: {
      label: 'Fuel',
      color: 'var(--chart-1)',
    },
    Misc: {
      label: 'Misc. Expenses',
      color: 'var(--chart-2)',
    },
    Other: {
      label: 'Other',
      color: 'var(--chart-3)',
    },
  } satisfies ChartConfig

  if (!chartData.length) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <p>No data available for selected filters</p>
      </div>
    )
  }

  const total = chartData.reduce((sum, item) => sum + item.value, 0)

  return (
    <ChartContainer config={chartConfig} className="h-64 w-full">
      <PieChart>
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value, name) => {
                const percentage = ((Number(value) / total) * 100).toFixed(1)
                return [
                  <div key={name as string} className="space-y-1">
                    <div className="font-medium">${Number(value).toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">{percentage}% of total</div>
                  </div>,
                  name,
                ]
              }}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={80}
          paddingAngle={2}
          dataKey="value"
          nameKey="category"
          animationDuration={800}
          animationBegin={0}
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Pie>
      </PieChart>
    </ChartContainer>
  )
}
