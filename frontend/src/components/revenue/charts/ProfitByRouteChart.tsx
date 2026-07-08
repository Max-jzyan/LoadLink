import { useMemo } from 'react'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import type { DashboardViewMode, LoadRevenue } from '@/services/driverApi/driverEnum'

interface ProfitByRouteChartProps {
  loadBreakdown: LoadRevenue[]
  maxRoutes?: number
  viewMode?: DashboardViewMode
}

export function ProfitByRouteChart({
  loadBreakdown,
  maxRoutes = 10,
  viewMode = 'completed',
}: ProfitByRouteChartProps) {
  const isPotential = viewMode === 'potential'
  const chartData = useMemo(() => {
    if (!loadBreakdown.length) return []

    // Group by route and calculate total profit
    const routeMap = new Map<string, { profit: number; count: number; avgProfit: number }>()

    loadBreakdown.forEach((load) => {
      const routeKey = `${load.originAddress} → ${load.destinationAddress}`
      const existing = routeMap.get(routeKey) || { profit: 0, count: 0, avgProfit: 0 }

      routeMap.set(routeKey, {
        profit: existing.profit + load.netProfit,
        count: existing.count + 1,
        avgProfit: (existing.profit + load.netProfit) / (existing.count + 1),
      })
    })

    // Convert to array, sort by profit, and take top N
    return Array.from(routeMap.entries())
      .map(([route, data]) => ({
        route: route.length > 20 ? route.substring(0, 20) + '...' : route,
        fullRoute: route,
        profit: data.profit,
        count: data.count,
      }))
      .sort((a, b) => b.profit - a.profit)
      .slice(0, maxRoutes)
  }, [loadBreakdown, maxRoutes])

  const chartConfig = {
    profit: {
      label: isPotential ? 'Expected Profit' : 'Net Profit',
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
          angle={-45}
          textAnchor="end"
          height={80}
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
              formatter={(value, name, props) => {
                if (name === 'profit' && props.payload) {
                  return [
                    <div key="profit" className="space-y-1">
                      <div className="font-medium">${Number(value).toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">
                        {props.payload.count} load{props.payload.count !== 1 ? 's' : ''}
                      </div>
                      <div className="text-xs text-muted-foreground">{props.payload.fullRoute}</div>
                    </div>,
                    isPotential ? 'Expected Profit' : 'Net Profit',
                  ]
                }
                return [value, name]
              }}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar
          dataKey="profit"
          fill="var(--color-profit)"
          radius={[4, 4, 0, 0]}
          animationDuration={800}
          animationEasing="ease-in-out"
        />
      </BarChart>
    </ChartContainer>
  )
}
