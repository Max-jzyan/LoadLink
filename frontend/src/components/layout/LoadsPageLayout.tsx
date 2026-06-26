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
}: LoadsPageLayoutProps) {
  return (
    <div className="flex flex-col gap-3">
      {/* ── Stats Cards Row ── */}
      {isLoading ? (
        <div className="grid grid-cols-4 gap-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[100px] rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-2">{statsCards}</div>
      )}

      {/* ── Table Row ── */}
      <div className="min-h-[300px]">{table}</div>

      {/* ── Map Row ── */}
      <DynamicCard title="Map">
        <div style={{ height: mapHeight }}>{map}</div>
      </DynamicCard>
    </div>
  )
}
