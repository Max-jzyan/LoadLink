import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import type { SpendLoad } from '@/lib/companySpend'
import { format, startOfWeek } from 'date-fns'
import { useMemo } from 'react'
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'

/**
 * Weekly spend trend — completed spend vs committed (booked/in-transit) spend.
 * Mirrors the driver Revenue Center's RevenueTimeChart.
 */
export function SpendTimeChart({ spendLoads }: { spendLoads: SpendLoad[] }) {
  const chartData = useMemo(() => {
    if (!spendLoads.length) return []

    const grouped = new Map<number, { spent: number; committed: number }>()

    spendLoads.forEach((load) => {
      const weekStart = startOfWeek(new Date(load.date), { weekStartsOn: 1 })
      const key = weekStart.getTime()
      const existing = grouped.get(key) ?? { spent: 0, committed: 0 }
      grouped.set(key, {
        spent: existing.spent + (load.committed ? 0 : load.price),
        committed: existing.committed + (load.committed ? load.price : 0),
      })
    })

    return Array.from(grouped.entries())
      .sort(([a], [b]) => a - b)
      .map(([ts, data]) => ({
        period: format(new Date(ts), 'MMM d'),
        spent: data.spent,
        committed: data.committed,
      }))
  }, [spendLoads])

  const chartConfig = {
    spent: {
      label: 'Spent',
      color: 'var(--chart-1)',
    },
    committed: {
      label: 'Committed',
      color: 'var(--chart-2)',
    },
  } satisfies ChartConfig

  if (!chartData.length) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <p>No spend data yet — completed and booked loads will appear here</p>
      </div>
    )
  }

  return (
    <ChartContainer config={chartConfig} className="h-64 w-full">
      <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
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
          dataKey="spent"
          stroke="var(--color-spent)"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
        <Line
          type="monotone"
          dataKey="committed"
          stroke="var(--color-committed)"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
      </LineChart>
    </ChartContainer>
  )
}
