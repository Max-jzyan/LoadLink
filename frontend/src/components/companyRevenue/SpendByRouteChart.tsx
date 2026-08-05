import { ARROW, RouteAxisTick } from '@/components/shared/RouteAxisTick'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import type { SpendLoad } from '@/lib/companySpend'
import { formatMoney } from '@/lib/format'
import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'

/**
 * Top routes ranked by total spend. Mirrors the driver Revenue Center's
 * ProfitByRouteChart.
 */
export function SpendByRouteChart({
  spendLoads,
  maxRoutes = 10,
}: {
  spendLoads: SpendLoad[]
  maxRoutes?: number
}) {
  const chartData = useMemo(() => {
    if (!spendLoads.length) return []

    const routeMap = new Map<string, { spend: number; count: number }>()

    spendLoads.forEach((load) => {
      const routeKey = `${load.originAddress.split(',')[0].trim()}${ARROW}${load.destinationAddress.split(',')[0].trim()}`
      const existing = routeMap.get(routeKey) ?? { spend: 0, count: 0 }
      routeMap.set(routeKey, {
        spend: existing.spend + load.price,
        count: existing.count + 1,
      })
    })

    return Array.from(routeMap.entries())
      .map(([route, data]) => ({
        route,
        spend: data.spend,
        count: data.count,
      }))
      .sort((a, b) => b.spend - a.spend)
      .slice(0, maxRoutes)
  }, [spendLoads, maxRoutes])

  const chartConfig = {
    spend: {
      label: 'Total Spend',
      color: 'var(--chart-3)',
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
      <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="route"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          className="text-xs"
          tick={<RouteAxisTick />}
          height={45}
          interval={0}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          className="text-xs"
          tickFormatter={(value) => `$${(value / 1000).toFixed(1)}k`}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value, _name, props) => {
                const count = props.payload?.count ?? 0
                return (
                  <div className="flex flex-1 items-center justify-between gap-3 leading-none">
                    <span className="text-muted-foreground">
                      {count} load{count === 1 ? '' : 's'}
                    </span>
                    <span className="font-mono font-medium text-foreground tabular-nums">
                      {formatMoney(Number(value))}
                    </span>
                  </div>
                )
              }}
            />
          }
        />
        <Bar dataKey="spend" fill="var(--color-spend)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  )
}
