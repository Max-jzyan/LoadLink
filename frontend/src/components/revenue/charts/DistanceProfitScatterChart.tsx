import { useMemo } from 'react'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { Scatter, ScatterChart, CartesianGrid, XAxis, YAxis, ZAxis } from 'recharts'
import type { DashboardViewMode, LoadRevenue } from '@/services/driverApi/driverEnum'

interface DistanceProfitScatterChartProps {
  loadBreakdown: LoadRevenue[]
  viewMode?: DashboardViewMode
}

export function DistanceProfitScatterChart({ loadBreakdown, viewMode = 'completed' }: DistanceProfitScatterChartProps) {
  const isPotential = viewMode === 'potential'
  const chartData = useMemo(() => {
    if (!loadBreakdown.length) return []

    return loadBreakdown.map((load) => ({
      distance: load.distanceKm,
      profit: load.netProfit,
      payout: load.payout,
      route: `${load.originAddress} → ${load.destinationAddress}`,
    }))
  }, [loadBreakdown])

  const chartConfig = {
    profit: {
      label: isPotential ? 'Expected Profit' : 'Net Profit',
      color: 'var(--chart-4)',
    },
    Loads: {
      label: 'Loads',
      color: 'var(--chart-4)',
    },
  } satisfies ChartConfig

  if (!chartData.length) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <p>No data available for selected filters</p>
      </div>
    )
  }

  // Calculate bubble size range
  const maxPayout = Math.max(...chartData.map((d) => d.payout))
  const minPayout = Math.min(...chartData.map((d) => d.payout))
  
  // Dynamic bubble size range based on payout distribution
  // Scale bubble radius between 40px and 300px based on payout values
  const bubbleSizeRange = maxPayout > minPayout 
    ? [40, 300] 
    : [100, 100] // Uniform size if all payouts are the same

  return (
    <ChartContainer config={chartConfig} className="h-64 w-full">
      <ScatterChart
        margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          type="number"
          dataKey="distance"
          name="Distance"
          unit=" km"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          className="text-xs"
          label={{ value: 'Distance (km)', position: 'insideBottom', offset: -5, className: 'text-xs' }}
        />
        <YAxis
          type="number"
          dataKey="profit"
          name="Profit"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          className="text-xs"
          tickFormatter={(value) => `$${(value / 1000).toFixed(1)}k`}
          label={{ value: isPotential ? 'Expected Profit ($)' : 'Net Profit ($)', angle: -90, position: 'insideLeft', className: 'text-xs' }}
        />
        <ZAxis
          type="number"
          dataKey="payout"
          range={bubbleSizeRange}
          name="Payout"
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value, name, props) => {
                if (props.payload) {
                  return [
                    <div key="details" className="space-y-1">
                      <div className="font-medium">${Number(value).toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">
                        Distance: {props.payload.distance} km
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Payout: ${props.payload.payout.toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {props.payload.route}
                      </div>
                    </div>,
                    name === 'profit' ? (isPotential ? 'Expected Profit' : 'Net Profit') : name === 'distance' ? 'Distance' : 'Payout',
                  ]
                }
                return [value, name]
              }}
              labelFormatter={() => ''}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Scatter
          name="Loads"
          data={chartData}
          fill="var(--color-profit)"
          animationDuration={800}
          animationEasing="ease-in-out"
        />
      </ScatterChart>
    </ChartContainer>
  )
}