import { TooltipProvider } from '@/components/ui/tooltip'
import DynamicCard from '@/components/layout/DynamicCard'
import { DataTable } from '@/components/shared/DataTable'
import { createColumns } from './revenueColumns'
import type { DashboardViewMode, LoadRevenue } from '@/services/driverApi/driverEnum'

export function RevenueTable({
  loadBreakdown,
  onPerLoadSaved,
  viewMode = 'completed',
}: {
  loadBreakdown: LoadRevenue[]
  onPerLoadSaved: () => void
  viewMode?: DashboardViewMode
}) {
  const isPotential = viewMode === 'potential'
  const columns = createColumns(onPerLoadSaved, viewMode)

  return (
    <DynamicCard title={isPotential ? 'Active Loads Breakdown' : 'Per-Load Breakdown'} expand>
      {loadBreakdown.length > 0 ? (
        <TooltipProvider>
          <DataTable columns={columns} data={loadBreakdown} />
        </TooltipProvider>
      ) : (
        <div className="flex h-32 items-center justify-center text-muted-foreground">
          {isPotential
            ? 'No active loads yet. Book a load to see potential revenue.'
            : 'No completed loads yet. Complete a load to see your revenue breakdown.'}
        </div>
      )}
    </DynamicCard>
  )
}
