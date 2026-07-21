import PageShell from '@/components/layout/PageShell'
import DynamicCard from '@/components/layout/DynamicCard'
import { RoutePath } from '@/config/routes'
import {
  useGetPlatformStatsQuery,
  useListRateConfirmationsQuery,
} from '@/services/adminApi/adminSlice'
import { Loader2, FileText, Users, Truck, ClipboardList, Package, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Link } from 'react-router-dom'
import { Skeleton } from '@/components/ui/skeleton'

function StatCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-5 flex items-center gap-4">
      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-muted shrink-0">
        <Skeleton className="h-5 w-5 rounded-full" />
      </div>
      <div className="space-y-2 flex-1">
        <Skeleton className="h-7 w-16" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  icon: Icon,
  description,
}: {
  label: string
  value: number | undefined
  icon: React.ElementType
  description?: string
}) {
  return (
    <div className="rounded-xl border bg-card p-5 flex items-center gap-4">
      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 shrink-0">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div>
        <div className="text-2xl font-bold">{value ?? '—'}</div>
        <div className="text-sm text-muted-foreground">{label}</div>
        {description && (
          <div className="text-xs text-muted-foreground/70 mt-0.5">{description}</div>
        )}
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } = useGetPlatformStatsQuery()
  const { data: rcList = [], isLoading: rcLoading } = useListRateConfirmationsQuery()

  const recentRc = rcList.slice(0, 5)

  return (
    <PageShell title="Admin Dashboard" subtitle="Platform overview and quick actions">
      {/* Stats grid */}
      {statsLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard label="Drivers" value={stats?.totalDrivers} icon={Truck} />
          <StatCard label="Companies" value={stats?.totalCompanies} icon={Users} />
          <StatCard label="Loads" value={stats?.totalLoads} icon={Package} />
          <StatCard label="Bids" value={stats?.totalBids} icon={ClipboardList} />
          <StatCard
            label="Docs to Review"
            value={stats?.driversWithDocs}
            icon={FileText}
            description="Drivers with uploaded docs"
          />
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
        <DynamicCard title="Document Review">
          <p className="text-sm text-muted-foreground mb-4">
            Review uploaded insurance certificates and approval requests from drivers.
          </p>
          <Button asChild>
            <Link to={RoutePath.AdminDocuments}>Open Document Review</Link>
          </Button>
        </DynamicCard>

        <DynamicCard title="User Management">
          <p className="text-sm text-muted-foreground mb-4">
            Browse all platform users sorted by registration date.
          </p>
          <Button variant="outline" asChild>
            <Link to={RoutePath.AdminUsers}>View All Users</Link>
          </Button>
        </DynamicCard>
      </div>

      {/* Recent Rate Confirmations */}
      <DynamicCard
        title="Recent Rate Confirmations"
        action={
          <Button variant="outline" size="sm" asChild>
            <Link to={RoutePath.AdminRateConfirmations}>View All</Link>
          </Button>
        }
        className="mt-6"
      >
        {rcLoading && !statsLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : !rcLoading && recentRc.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No rate confirmations yet.</p>
        ) : (
          <div className="space-y-2">
            {recentRc.map((bid) => {
              const load = typeof bid.loadId === 'object' ? bid.loadId : null
              const driver = typeof bid.driverId === 'object' ? bid.driverId : null
              return (
                <div
                  key={bid._id}
                  className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    {load ? (
                      <p className="font-medium truncate">
                        {load.originAddress.split(',')[0]} → {load.destinationAddress.split(',')[0]}
                      </p>
                    ) : (
                      <p className="font-medium text-muted-foreground">
                        Load #{String(bid.loadId).slice(-6)}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {driver?.name ?? 'Driver'} · ${bid.amount.toFixed(2)}
                    </p>
                  </div>
                  {bid.rateConfirmationUrl && (
                    <a
                      href={bid.rateConfirmationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 ml-2"
                    >
                      <Badge variant="outline" className="gap-1 cursor-pointer hover:bg-muted">
                        <ShieldCheck className="h-3 w-3" />
                        PDF
                      </Badge>
                    </a>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </DynamicCard>
    </PageShell>
  )
}
