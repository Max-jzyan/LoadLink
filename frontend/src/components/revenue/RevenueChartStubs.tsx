import DynamicCard from '@/components/layout/DynamicCard'

export function RevenueChartStubs() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <DynamicCard title="Revenue Over Time" description="Chart coming soon" expand>
        <div className="flex h-48 items-center justify-center rounded-md border border-dashed text-muted-foreground">
          <p>Revenue trend chart placeholder</p>
        </div>
      </DynamicCard>
      <DynamicCard title="Expense Breakdown" description="Chart coming soon" expand>
        <div className="flex h-48 items-center justify-center rounded-md border border-dashed text-muted-foreground">
          <p>Expense pie chart placeholder</p>
        </div>
      </DynamicCard>
    </div>
  )
}