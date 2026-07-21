/**
 * AI-powered panels for the DriverAuctions page (OpenRouter integration).
 *
 * AiInsightsPanel   — appears when the user clicks the ✦ sparkles button; shows a
 *                     decisive natural-language recommendation about the top loads.
 *                     Loading state IS shown since the user explicitly triggered it.
 * AiFuelStopsPanel  — shown in the "Fuel Stops" layer tab when a load is selected.
 * AiRestAreasPanel  — shown in the "Rest Areas" layer tab when a load is selected.
 *
 * All three return null silently when the backend has no OpenRouter key configured.
 */

import { Sparkles, X, Fuel, BedDouble, Loader2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  useGetAiInsightsQuery,
  useGetAiFuelStopsQuery,
  useGetAiRestAreasQuery,
} from '@/services/driverApi/driverSlice'

// ── shared helper ─────────────────────────────────────────────────────────────

interface StopListProps {
  items: Array<{ city: string; province: string; reason: string }>
  colorClass: string
  badgeClass: string
  badgeText: string
}

function StopList({ items, colorClass, badgeClass, badgeText }: StopListProps) {
  if (items.length === 0) {
    return (
      <div className={`flex items-center gap-2 text-xs ${colorClass}`}>
        <AlertCircle className="h-3.5 w-3.5" />
        No stops needed for this short route.
      </div>
    )
  }
  return (
    <ol className="space-y-1.5">
      {items.map((stop, i) => (
        <li key={i} className="flex items-start gap-2 text-sm">
          <span
            className={`mt-0.5 flex-none rounded-full ${badgeClass} text-[10px] font-bold w-4 h-4 flex items-center justify-center`}
          >
            {i + 1}
          </span>
          <div className="min-w-0">
            <span className={`font-medium ${badgeText}`}>
              {stop.city}, {stop.province}
            </span>
            {stop.reason && <span className={`ml-1 text-xs ${colorClass}`}>— {stop.reason}</span>}
          </div>
        </li>
      ))}
    </ol>
  )
}

// ── Load insight banner ───────────────────────────────────────────────────────

interface AiInsightsPanelProps {
  driverId: string
  /** Called when the user dismisses the panel — lets the parent reset its triggered state */
  onDismiss?: () => void
  className?: string
}

/**
 * Only mount this component when the user has explicitly triggered it.
 * Loading state IS rendered because the user chose to generate the insight.
 * Always refetches on mount so re-clicking the sparkles button regenerates the insight.
 */
export function AiInsightsPanel({ driverId, onDismiss, className }: AiInsightsPanelProps) {
  const { data, isLoading, isError } = useGetAiInsightsQuery(driverId, {
    pollingInterval: 0,
    refetchOnMountOrArgChange: true,
  })

  if (isError) return null
  // Silently hide if backend has no key — user gets visual feedback from button state
  if (!isLoading && data && !data.available) return null

  return (
    <div
      className={cn(
        'relative rounded-xl border border-violet-200 bg-violet-50 dark:border-violet-800 dark:bg-violet-950/40 px-4 py-3 text-sm',
        className
      )}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <Sparkles className="h-3.5 w-3.5 text-violet-500 shrink-0" />
        <span className="text-xs font-semibold text-violet-700 dark:text-violet-300 uppercase tracking-wide">
          AI Insight
        </span>
        <button
          onClick={() => onDismiss?.()}
          aria-label="Dismiss AI insight"
          className="ml-auto text-violet-400 hover:text-violet-600 dark:hover:text-violet-200 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-violet-500 text-xs">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Analysing available loads…
        </div>
      )}
      {!isLoading && data?.available && (
        <p className="text-violet-800 dark:text-violet-200 leading-relaxed">{data.insight}</p>
      )}
    </div>
  )
}

// ── Fuel stops panel ──────────────────────────────────────────────────────────

interface RouteLayerPanelProps {
  driverId: string
  loadId: string
  className?: string
}

export function AiFuelStopsPanel({ driverId, loadId, className }: RouteLayerPanelProps) {
  const { data, isLoading, isError } = useGetAiFuelStopsQuery(
    { driverId, loadId },
    { skip: !driverId || !loadId }
  )

  if (isLoading || isError) return null
  if (!data?.available) return null

  return (
    <div
      className={cn(
        'rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40 px-4 py-3',
        className
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <Fuel className="h-3.5 w-3.5 text-amber-500 shrink-0" />
        <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wide">
          Suggested Fuel Stops
        </span>
        <span className="ml-auto text-[10px] text-amber-500 flex items-center gap-1">
          <Sparkles className="h-3 w-3" />
          AI
        </span>
      </div>
      <StopList
        items={data.stops}
        colorClass="text-amber-600 dark:text-amber-400"
        badgeClass="bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200"
        badgeText="text-amber-900 dark:text-amber-100"
      />
    </div>
  )
}

// ── Rest areas panel ──────────────────────────────────────────────────────────

export function AiRestAreasPanel({ driverId, loadId, className }: RouteLayerPanelProps) {
  const { data, isLoading, isError } = useGetAiRestAreasQuery(
    { driverId, loadId },
    { skip: !driverId || !loadId }
  )

  if (isLoading || isError) return null
  if (!data?.available) return null

  return (
    <div
      className={cn(
        'rounded-xl border border-sky-200 bg-sky-50 dark:border-sky-800 dark:bg-sky-950/40 px-4 py-3',
        className
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <BedDouble className="h-3.5 w-3.5 text-sky-500 shrink-0" />
        <span className="text-xs font-semibold text-sky-700 dark:text-sky-300 uppercase tracking-wide">
          Suggested Rest Areas
        </span>
        <span className="ml-auto text-[10px] text-sky-500 flex items-center gap-1">
          <Sparkles className="h-3 w-3" />
          AI
        </span>
      </div>
      <StopList
        items={data.areas}
        colorClass="text-sky-600 dark:text-sky-400"
        badgeClass="bg-sky-200 dark:bg-sky-800 text-sky-800 dark:text-sky-200"
        badgeText="text-sky-900 dark:text-sky-100"
      />
    </div>
  )
}
