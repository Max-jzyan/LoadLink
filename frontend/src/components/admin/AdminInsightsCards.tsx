import DynamicCard from '@/components/layout/DynamicCard'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { Bar, BarChart, XAxis } from 'recharts'
import { Building2, Truck, Route, Activity } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, parseISO } from 'date-fns'
import type { TopCompany, TopDriver, TopLane, ActivityStats } from '@/services/adminApi/adminEnum'

function RankBadge({ rank }: { rank: number }) {
  const colors = [
    'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    'bg-slate-400/15 text-slate-600 dark:text-slate-300',
    'bg-orange-500/15 text-orange-600 dark:text-orange-400',
  ]
  return (
    <div
      className={cn(
        'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
        colors[rank] ?? 'bg-muted text-muted-foreground'
      )}
    >
      {rank + 1}
    </div>
  )
}

function ListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full rounded-lg" />
      ))}
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return <p className="text-sm text-muted-foreground italic px-1 py-4">{message}</p>
}

export function TopCompaniesCard({
  companies,
  isLoading,
}: {
  companies: TopCompany[]
  isLoading: boolean
}) {
  const max = Math.max(1, ...companies.map((c) => c.totalRevenue))

  return (
    <DynamicCard
      title="Top Companies"
      description="By confirmed freight value"
      className="rounded-2xl ring-1 ring-foreground/10"
      noBorder
    >
      {isLoading ? (
        <ListSkeleton />
      ) : companies.length === 0 ? (
        <EmptyState message="No accepted bids yet." />
      ) : (
        <div className="space-y-1">
          {companies.map((c, i) => (
            <div key={c._id} className="flex items-center gap-3 rounded-lg px-1 py-2">
              <RankBadge rank={i} />
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                <Building2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{c.name}</p>
                <div className="mt-1 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500/70"
                    style={{ width: `${Math.max(6, (c.totalRevenue / max) * 100)}%` }}
                  />
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold tabular-nums">
                  ${c.totalRevenue.toLocaleString('en-CA')}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {c.loadCount} load{c.loadCount === 1 ? '' : 's'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </DynamicCard>
  )
}

export function TopDriversCard({
  drivers,
  isLoading,
}: {
  drivers: TopDriver[]
  isLoading: boolean
}) {
  const max = Math.max(1, ...drivers.map((d) => d.totalRevenue))

  return (
    <DynamicCard
      title="Top Drivers"
      description="By confirmed freight value"
      className="rounded-2xl ring-1 ring-foreground/10"
      noBorder
    >
      {isLoading ? (
        <ListSkeleton />
      ) : drivers.length === 0 ? (
        <EmptyState message="No accepted bids yet." />
      ) : (
        <div className="space-y-1">
          {drivers.map((d, i) => (
            <div key={d._id} className="flex items-center gap-3 rounded-lg px-1 py-2">
              <RankBadge rank={i} />
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-500/10">
                <Truck className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{d.name}</p>
                <div className="mt-1 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-sky-500/70"
                    style={{ width: `${Math.max(6, (d.totalRevenue / max) * 100)}%` }}
                  />
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold tabular-nums">
                  ${d.totalRevenue.toLocaleString('en-CA')}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {d.bidCount} bid{d.bidCount === 1 ? '' : 's'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </DynamicCard>
  )
}

export function TopLanesCard({ lanes, isLoading }: { lanes: TopLane[]; isLoading: boolean }) {
  const max = Math.max(1, ...lanes.map((l) => l.count))

  return (
    <DynamicCard
      title="Popular Lanes"
      description="Most frequently posted routes"
      className="rounded-2xl ring-1 ring-foreground/10"
      noBorder
    >
      {isLoading ? (
        <ListSkeleton />
      ) : lanes.length === 0 ? (
        <EmptyState message="No loads posted yet." />
      ) : (
        <div className="space-y-1">
          {lanes.map((l, i) => (
            <div
              key={`${l.origin}-${l.destination}-${i}`}
              className="flex items-center gap-3 rounded-lg px-1 py-2"
            >
              <RankBadge rank={i} />
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
                <Route className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">
                  {l.origin} → {l.destination}
                </p>
                <div className="mt-1 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-amber-500/70"
                    style={{ width: `${Math.max(6, (l.count / max) * 100)}%` }}
                  />
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold tabular-nums">{l.count}</p>
                <p className="text-[11px] text-muted-foreground">loads</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </DynamicCard>
  )
}

export function ActivityCard({
  activity,
  isLoading,
}: {
  activity: ActivityStats | undefined
  isLoading: boolean
}) {
  const chartData = (activity?.lastActiveDistribution ?? []).map((p) => ({
    label: format(parseISO(p.date), 'MMM d'),
    value: p.value,
  }))

  const chartConfig = {
    value: { label: 'Last seen', color: 'var(--chart-2)' },
  } satisfies ChartConfig

  return (
    <DynamicCard
      title="User Activity"
      description="Login recency across the platform"
      className="rounded-2xl ring-1 ring-foreground/10"
      noBorder
    >
      {isLoading ? (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-muted/50 p-3">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Activity className="h-3.5 w-3.5" />
                <p className="text-xs">Last 24h</p>
              </div>
              <p className="text-lg font-bold tabular-nums mt-1">{activity?.activeLast24h ?? 0}</p>
            </div>
            <div className="rounded-xl bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">Last 7d</p>
              <p className="text-lg font-bold tabular-nums mt-1">{activity?.activeLast7d ?? 0}</p>
            </div>
            <div className="rounded-xl bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">Last 30d</p>
              <p className="text-lg font-bold tabular-nums mt-1">{activity?.activeLast30d ?? 0}</p>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-xs text-muted-foreground mb-2">
              Users last seen, by day (last 14 days)
            </p>
            {chartData.length === 0 ? (
              <div className="flex h-28 items-center justify-center text-muted-foreground text-sm">
                No recent activity data.
              </div>
            ) : (
              <ChartContainer config={chartConfig} className="h-28 w-full">
                <BarChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={6}
                    className="text-[10px]"
                    interval={1}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" fill="var(--color-value)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </div>
        </>
      )}
    </DynamicCard>
  )
}
