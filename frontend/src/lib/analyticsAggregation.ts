import { format, parseISO, startOfWeek, startOfMonth } from 'date-fns'
import type { AnalyticsPoint } from '@/services/adminApi/adminEnum'

export type Granularity = 'day' | 'week' | 'month'

export interface AggregatedPoint {
  /** Sortable bucket key (ISO date string of the bucket start). */
  key: string
  /** Human-readable label for the X axis. */
  label: string
  value: number
}

/**
 * Rolls up a daily analytics series into day / week / month buckets.
 * Weeks start on Monday; months are calendar months. Used to power the
 * "day by day / week by week / month by month" toggle on admin dashboard
 * analytics charts — all aggregation happens client-side from the single
 * daily series returned by the backend.
 */
export function aggregateAnalyticsPoints(
  points: AnalyticsPoint[],
  granularity: Granularity
): AggregatedPoint[] {
  if (granularity === 'day') {
    return points.map((p) => ({
      key: p.date,
      label: format(parseISO(p.date), 'MMM d'),
      value: p.value,
    }))
  }

  const buckets = new Map<string, number>()
  points.forEach((p) => {
    const d = parseISO(p.date)
    const bucketDate =
      granularity === 'week' ? startOfWeek(d, { weekStartsOn: 1 }) : startOfMonth(d)
    const key = format(bucketDate, 'yyyy-MM-dd')
    buckets.set(key, (buckets.get(key) ?? 0) + p.value)
  })

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => ({
      key,
      label:
        granularity === 'week'
          ? `Wk of ${format(parseISO(key), 'MMM d')}`
          : format(parseISO(key), 'MMM yyyy'),
      value,
    }))
}
