import { Link } from 'react-router-dom'
import { Plus, Truck } from 'lucide-react'
import { useSelector } from 'react-redux'
import { Button } from '@/components/ui/button'
import { LoadCard } from '@/components/shared/LoadCard'
import PageShell from '@/components/layout/PageShell'
import { RoutePath } from '@/config/routes'
import { useListCompanyLoadsQuery } from '@/services/loadApi/loadSlice'
import { selectMongoId } from '@/services/authSlice'
import Spinner from '@/components/shared/Spinner'

export default function Loads() {
  const companyId = useSelector(selectMongoId)

  const {
    data: loads,
    isLoading,
    isError,
  } = useListCompanyLoadsQuery(companyId!, {
    skip: !companyId,
  })

  if (!companyId) {
    return <Spinner fullPage />
  }

  const count = loads?.length ?? 0

  return (
    <PageShell
      title="Your Loads"
      subtitle={!isError && !isLoading ? `${count} load${count !== 1 ? 's' : ''}` : undefined}
      actions={
        <Button asChild size="sm">
          <Link to={RoutePath.PostLoad}>
            <Plus className="mr-1.5 h-4 w-4" />
            Post Load
          </Link>
        </Button>
      }
    >
      {isLoading && (
        <div className="flex items-center justify-center min-h-[40vh]">
          <Spinner />
        </div>
      )}

      {/* error */}
      {isError && (
        <div className="min-h-[40vh] rounded-xl border border-destructive/30 bg-destructive/5 flex items-center justify-center p-6">
          <p className="text-destructive text-sm font-medium">
            Failed to load your loads. Please refresh.
          </p>
        </div>
      )}

      {/* when there is no loads */}
      {!isLoading && !isError && count === 0 && (
        <div className="min-h-[40vh] rounded-xl border border-dashed bg-muted/30 flex flex-col items-center justify-center gap-4 p-8">
          <div className="rounded-full bg-muted p-4">
            <Truck size={28} className="text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="font-medium text-sm">No loads posted yet</p>
            <p className="text-muted-foreground text-sm mt-1">
              Post your first load to start receiving bids from drivers.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to={RoutePath.PostLoad}>
              <Plus className="mr-1.5 h-4 w-4" />
              Post your first load
            </Link>
          </Button>
        </div>
      )}

      {/* list of all the loads */}
      {!isLoading && !isError && count > 0 && (
        <div className="flex flex-col gap-3">
          {loads!.map((load) => (
            <LoadCard key={load._id} load={load} />
          ))}
        </div>
      )}
    </PageShell>
  )
}
