import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RoutePath } from '@/config/routes'
import { useListCompanyLoadsQuery } from '@/services/loadApi/loadSlice'

// TODO: replace with real companyId from auth once auth is functional
const DEV_COMPANY_ID = '000000000000000000000001'

export default function Loads() {
  const { data: loads, isLoading, isError } = useListCompanyLoadsQuery(DEV_COMPANY_ID)

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Loads</h1>
        <Button asChild>
          <Link to={RoutePath.PostLoad}>
            <Plus className="mr-2 h-4 w-4" />
            Post Load
          </Link>
        </Button>
      </div>

      {isLoading && (
        <div className="flex flex-1 items-center justify-center min-h-[40vh]">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
        </div>
      )}

      {isError && (
        <div className="min-h-[40vh] flex-1 rounded-xl bg-muted/50 p-6 flex items-center justify-center">
          <p className="text-destructive text-lg">Failed to load loads. Please try again.</p>
        </div>
      )}

      {!isLoading && !isError && (!loads || loads.length === 0) && (
        <div className="min-h-[40vh] flex-1 rounded-xl bg-muted/50 p-6 flex flex-col items-center justify-center gap-4">
          <p className="text-muted-foreground text-lg">No loads posted yet.</p>
          <Button asChild variant="outline">
            <Link to={RoutePath.PostLoad}>
              <Plus className="mr-2 h-4 w-4" />
              Post your first load
            </Link>
          </Button>
        </div>
      )}

      {!isLoading && !isError && loads && loads.length > 0 && (
        <div className="flex flex-col gap-3">
          {loads.map((load) => (
            <div
              key={load._id}
              className="rounded-xl border bg-card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
            >
              <div className="flex flex-col gap-1">
                <span className="font-medium text-sm">
                  {load.originAddress} → {load.destinationAddress}
                </span>
                <span className="text-xs text-muted-foreground">
                  {load.truckType} · {load.weightLbs} lbs · {load.trailerLengthFt} ft
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">
                  {load.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
