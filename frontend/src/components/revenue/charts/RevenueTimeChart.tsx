import { useMemo } from 'react'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import type { DashboardViewMode, LoadRevenue } from '@/services/driverApi/driverEnum'
import { format, startOfWeek } from 'date-fns'

interface RevenueTimeChartProps {
  loadBreakdown: LoadRevenue[]
  viewMode?: DashboardViewMode
}

export function RevenueTimeChart({ loadBreakdown, viewMode = 'completed' }: RevenueTimeChartProps) {
  const isPotential = viewMode === 'potential'
  const chartData = useMemo(() => {
    if (!loadBreakdown.length) return []

    // Group loads by time period
    const grouped = new Map<string, { revenue: number; expenses: number; count: number }>()

    loadBreakdown.forEach((load) => {
      const date = new Date(load.completedAt)
      let key: string

      // Use week grouping for better visualization
      const weekStart = startOfWeek(date, { weekStartsOn: 1 })
      key = format(weekStart, 'MMM d')

      const existing = grouped.get(key) || { revenue: 0, expenses: 0, count: 0 }
      grouped.set(key, {
        revenue: existing.revenue + load.payout,
        expenses: existing.expenses + load.totalExpenses,
        count: existing.count + 1,
      })
    })

    // Convert to array and sort by date
    return Array.from(grouped.entries())
      .map(([period, data]) => ({
        period,
        revenue: data.revenue,
        expenses: data.expenses,
        count: data.count,
      }))
      .sort((a, b) => a.period.localeCompare(b.period))
  }, [loadBreakdown])

  const chartConfig = {
    revenue: {
      label: isPotential ? 'Expected Revenue' : 'Revenue',
      color: 'var(--chart-1)',
    },
    expenses: {
      label: isPotential ? 'Estimated Expenses' : 'Expenses',
      color: 'var(--chart-2)',
    },
  } satisfies ChartConfig

  if (!chartData.length) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <p>No data available for selected filters</p>
      </div>
    )
  }

  return (
    <ChartContainer config={chartConfig} className="h-64 w-full">
      <LineChart
        data={chartData}
        margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="period"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          className="text-xs"
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          className="text-xs"
          tickFormatter={(value) => `$${(value / 1000).toFixed(1)}k`}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Line
          type="monotone"
          dataKey="revenue"
          stroke="var(--color-revenue)"
          strokeWidth={2}
          dot={{ fill: 'var(--color-revenue)', r: 4 }}
          activeDot={{ r: 6 }}
          animationDuration={800}
          animationEasing="ease-in-out"
        />
        <Line
          type="monotone"
          dataKey="expenses"
          stroke="var(--color-expenses)"
          strokeWidth={2}
          dot={{ fill: 'var(--color-expenses)', r: 4 }}
          activeDot={{ r: 6 }}
          animationDuration={800}
          animationEasing="ease-in-out"
        />
      </LineChart>
    </ChartContainer>
  )
}