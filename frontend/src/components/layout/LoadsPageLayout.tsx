import type { ReactNode } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import DynamicCard from '@/components/layout/DynamicCard'

interface LoadsPageLayoutProps {
  /** True while the initial data load is in progress (show skeletons) */
  isLoading: boolean
  /** 4 stat cards — bare DynamicCard elements (no Col wrappers) */
  statsCards: ReactNode
  /** Data table component */
  table: ReactNode
  /** Map component (should be a DriverMap wrapped as needed) */
  map: ReactNode
  /** Height of the map container in pixels (default 400) */
  mapHeight?: number
  /** Optional action element to show in the Map DynamicCard header (e.g. a "Reset View" button) */
  mapAction?: ReactNode
}

/**
 * Shared content layout for load-management-style pages (DriverLoads, CompanyDashboard).
 *
 * Renders a simple stacked layout inside a scroll container:
 *   Row 1: 4x stat cards
 *   Row 2: Data table
 *   Row 3: Map
 *
 * The header and filter bar are expected to come from the parent PageShell.
 *
 * The map component should receive `height="100%"` to fill the container defined by mapHeight.
 */
export default function LoadsPageLayout({
  isLoading,
  statsCards,
  table,
  map,
  mapHeight = 400,
  mapAction,
}: LoadsPageLayoutProps) {
  return (
    <div className="flex flex-col gap-3">
      {/* ── Stats Cards Row ── */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[100px] rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" data-tour="stats-cards">
          {statsCards}
        </div>
      )}

      {/* ── Table Row ── */}
      {isLoading ? (
        <div className="min-h-[300px] min-w-0 rounded-md border">
          <div className="divide-y">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-20 hidden sm:block" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="min-h-[300px] min-w-0" data-tour="loads-table">
          {table}
        </div>
      )}

      {/* ── Map Row ── */}
      <div data-tour="loads-map">
        <DynamicCard title="Map" action={mapAction}>
          {isLoading ? (
            <div
              className="flex items-center justify-center bg-muted/30 rounded-md"
              style={{ height: mapHeight }}
            >
              <div className="text-xs text-muted-foreground">Loading map…</div>
            </div>
          ) : (
            <div style={{ height: mapHeight }}>{map}</div>
          )}
        </DynamicCard>
      </div>
    </div>
  )
}
