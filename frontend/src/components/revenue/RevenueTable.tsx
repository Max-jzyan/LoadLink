import { TooltipProvider } from '@/components/ui/tooltip'
import DynamicCard from '@/components/layout/DynamicCard'
import { DataTable } from '@/components/shared/DataTable'
import { createColumns } from './revenueColumns'
import type { LoadRevenue } from '@/services/driverApi/driverEnum'

export function RevenueTable({
  loadBreakdown,
  onPerLoadSaved,
}: {
  loadBreakdown: LoadRevenue[]
  onPerLoadSaved: () => void
}) {
  const columns = createColumns(onPerLoadSaved)

  return (
    <DynamicCard title="Per-Load Breakdown" expand>
      {loadBreakdown.length > 0 ? (
        <TooltipProvider>
          <DataTable columns={columns} data={loadBreakdown} />
        </TooltipProvider>
      ) : (
        <div className="flex h-32 items-center justify-center text-muted-foreground">
          No completed loads yet. Complete a load to see your revenue breakdown.
        </div>
      )}
    </DynamicCard>
  )
}
