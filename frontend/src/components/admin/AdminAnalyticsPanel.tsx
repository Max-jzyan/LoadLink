import { useMemo, useState } from 'react'
import DynamicCard from '@/components/layout/DynamicCard'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'
import { useGetAdminAnalyticsQuery } from '@/services/adminApi/adminSlice'
import type { AnalyticsMetricKey } from '@/services/adminApi/adminEnum'
import { aggregateAnalyticsPoints, type Granularity } from '@/lib/analyticsAggregation'
import { cn } from '@/lib/utils'
import { DollarSign, Truck, Users, Package, ClipboardList } from 'lucide-react'

interface MetricDef {
  key: AnalyticsMetricKey
  label: string
  color: string
  isCurrency?: boolean
  icon: React.ElementType
}

const METRICS: MetricDef[] = [
  { key: 'revenue', label: 'Revenue', color: 'var(--chart-1)', isCurrency: true, icon: DollarSign },
  { key: 'newDrivers', label: 'New Drivers', color: 'var(--chart-2)', icon: Truck },
  { key: 'newCompanies', label: 'New Companies', color: 'var(--chart-3)', icon: Users },
  { key: 'loads', label: 'Loads Posted', color: 'var(--chart-4)', icon: Package },
  { key: 'bids', label: 'Bids Placed', color: 'var(--chart-5)', icon: ClipboardList },
]

const RANGE_OPTIONS: { label: string; value: number }[] = [
  { label: '7D', value: 7 },
  { label: '30D', value: 30 },
  { label: '90D', value: 90 },
  { label: '1Y', value: 365 },
]

const GRANULARITY_OPTIONS: { label: string; value: Granularity }[] = [
  { label: 'Day', value: 'day' },
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
]

function PillGroup<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex items-center gap-0.5 rounded-lg bg-muted p-0.5">
      {options.map((opt) => (
        <button
          key={String(opt.value)}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            'cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
            value === opt.value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

/**
 * Embedded, always-visible analytics chart for the admin dashboard — lets the
 * admin flip between the key platform metrics (revenue, sign-ups, loads,
 * bids) and view them day-by-day, week-by-week, or month-by-month over a
 * configurable look-back window, all from daily data aggregated client-side.
 */
export function AdminAnalyticsPanel() {
  const [metricKey, setMetricKey] = useState<AnalyticsMetricKey>('revenue')
  const [days, setDays] = useState(30)
  const [granularity, setGranularity] = useState<Granularity>('day')

  const { data, isLoading, isFetching } = useGetAdminAnalyticsQuery({ days })

  const metric = METRICS.find((m) => m.key === metricKey)!
  const points = data?.series[metricKey] ?? []
  const aggregated = useMemo(
    () => aggregateAnalyticsPoints(points, granularity),
    [points, granularity]
  )

  const total = useMemo(() => points.reduce((sum, p) => sum + p.value, 0), [points])
  const average = aggregated.length ? total / aggregated.length : 0
  const best = aggregated.reduce((max, p) => Math.max(max, p.value), 0)

  const formatValue = (v: number) =>
    metric.isCurrency ? `$${Math.round(v).toLocaleString('en-CA')}` : Math.round(v).toLocaleString('en-CA')

  const chartConfig = {
    value: { label: metric.label, color: metric.color },
  } satisfies ChartConfig

  const loading = isLoading || isFetching

  return (
    <DynamicCard className="rounded-2xl ring-1 ring-foreground/10" noBorder noPadding>
      <div className="p-5 pb-0">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold">Platform Trends</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Click a metric to explore it day-by-day, week-by-week, or month-by-month
            </p>
          </div>
          <div className="flex items-center gap-2">
            <PillGroup options={RANGE_OPTIONS} value={days} onChange={setDays} />
            <PillGroup options={GRANULARITY_OPTIONS} value={granularity} onChange={setGranularity} />
          </div>
        </div>

        {/* Metric selector pills */}
        <div className="mt-4 flex flex-wrap gap-2">
          {METRICS.map((m) => {
            const active = m.key === metricKey
            return (
              <button
                key={m.key}
                type="button"
                onClick={() => setMetricKey(m.key)}
                className={cn(
                  'flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors',
                  active
                    ? 'border-transparent bg-primary text-primary-foreground shadow-sm'
                    : 'border-border text-muted-foreground hover:bg-muted'
                )}
              >
                <m.icon className="h-3.5 w-3.5" />
                {m.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 px-5 mt-4">
        <div className="rounded-xl bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-lg font-bold tabular-nums">{formatValue(total)}</p>
        </div>
        <div className="rounded-xl bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground capitalize">Avg / {granularity}</p>
          <p className="text-lg font-bold tabular-nums">{formatValue(average)}</p>
        </div>
        <div className="rounded-xl bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground capitalize">Best {granularity}</p>
          <p className="text-lg font-bold tabular-nums">{formatValue(best)}</p>
        </div>
      </div>

      <div className="p-5 pt-4">
        {loading ? (
          <Skeleton className="h-64 w-full rounded-xl" />
        ) : aggregated.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-muted-foreground">
            <p>No data for this period.</p>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-64 w-full">
            <AreaChart data={aggregated} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="admin-trend-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-value)" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="var(--color-value)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                className="text-xs"
                interval={aggregated.length > 14 ? Math.ceil(aggregated.length / 10) - 1 : 0}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                className="text-xs"
                width={metric.isCurrency ? 48 : 32}
                tickFormatter={(v) => (metric.isCurrency ? `$${(v / 1000).toFixed(1)}k` : `${v}`)}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke="var(--color-value)"
                strokeWidth={2}
                fill="url(#admin-trend-fill)"
                animationDuration={500}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </div>
    </DynamicCard>
  )
}
