import PageShell from '@/components/layout/PageShell'
import DynamicCard from '@/components/layout/DynamicCard'
import { RoutePath } from '@/config/routes'
import {
  useGetPlatformStatsQuery,
  useGetAdminInsightsQuery,
  useListRateConfirmationsQuery,
  useListBillsOfLadingQuery,
} from '@/services/adminApi/adminSlice'
import {
  FileText,
  Users,
  Truck,
  ClipboardList,
  Package,
  ShieldCheck,
  DollarSign,
  Stamp,
  FolderCheck,
  UserCog,
  ArrowUpRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Link } from 'react-router-dom'
import { Skeleton } from '@/components/ui/skeleton'
import { AdminAnalyticsPanel } from '@/components/admin/AdminAnalyticsPanel'
import {
  TopCompaniesCard,
  TopDriversCard,
  TopLanesCard,
  ActivityCard,
} from '@/components/admin/AdminInsightsCards'
import { useAnimatedCurrency, useAnimatedNumber } from '@/hooks/useAnimatedNumber'
import { cn } from '@/lib/utils'

type Accent = 'primary' | 'sky' | 'emerald' | 'amber' | 'violet' | 'rose'

const ACCENT: Record<Accent, { icon: string; bg: string }> = {
  primary: { icon: 'text-primary', bg: 'bg-primary/10' },
  sky: { icon: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-500/10' },
  emerald: { icon: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
  amber: { icon: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10' },
  violet: { icon: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-500/10' },
  rose: { icon: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500/10' },
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80 mb-3">
      {children}
    </h2>
  )
}

function StatChip({
  label,
  value,
  icon: Icon,
  accent,
  isCurrency,
}: {
  label: string
  value: number | undefined
  icon: React.ElementType
  accent: Accent
  isCurrency?: boolean
}) {
  const colors = ACCENT[accent]
  const animated = useAnimatedNumber(value ?? 0)
  const animatedCurrency = useAnimatedCurrency(value)
  const display =
    value === undefined ? '—' : isCurrency ? animatedCurrency : Math.round(animated).toLocaleString()

  return (
    <div className="flex items-center gap-3 rounded-xl ring-1 ring-foreground/10 bg-card px-4 py-3 flex-1 min-w-[150px]">
      <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', colors.bg)}>
        <Icon className={cn('h-4 w-4', colors.icon)} />
      </div>
      <div className="min-w-0">
        <p className="text-base font-bold tabular-nums leading-tight truncate">{display}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  )
}

function StatChipSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-xl ring-1 ring-foreground/10 bg-card px-4 py-3 flex-1 min-w-[150px]">
      <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
      <div className="space-y-1.5 flex-1">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  )
}

interface DocRow {
  _id: string
  loadId: { originAddress: string; destinationAddress: string } | string
  driverId: { name: string } | string
  amount: number
}

function DocListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full rounded-xl" />
      ))}
    </div>
  )
}

function DocRowItem({ row, children }: { row: DocRow; children: React.ReactNode }) {
  const load = typeof row.loadId === 'object' ? row.loadId : null
  const driver = typeof row.driverId === 'object' ? row.driverId : null

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors hover:bg-muted/50">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted shrink-0">
          <Package className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          {load ? (
            <p className="font-medium truncate">
              {load.originAddress.split(',')[0]} → {load.destinationAddress.split(',')[0]}
            </p>
          ) : (
            <p className="font-medium text-muted-foreground">
              Load #{String(row.loadId).slice(-6)}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            {driver?.name ?? 'Driver'} · ${row.amount.toFixed(2)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">{children}</div>
    </div>
  )
}

export default function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } = useGetPlatformStatsQuery()
  const { data: insights, isLoading: insightsLoading } = useGetAdminInsightsQuery()
  const { data: rcList = [], isLoading: rcLoading } = useListRateConfirmationsQuery()
  const { data: bolList = [], isLoading: bolLoading } = useListBillsOfLadingQuery()

  const recentRc = rcList.slice(0, 5)
  const recentBol = bolList.slice(0, 5)

  return (
    <PageShell title="Admin Dashboard" subtitle="Platform overview and quick actions">
      {/* KPI strip */}
      {statsLoading ? (
        <div className="flex flex-wrap gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <StatChipSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          <StatChip label="Total Revenue" value={stats?.totalRevenue} icon={DollarSign} accent="primary" isCurrency />
          <StatChip label="Drivers" value={stats?.totalDrivers} icon={Truck} accent="sky" />
          <StatChip label="Companies" value={stats?.totalCompanies} icon={Users} accent="emerald" />
          <StatChip label="Loads" value={stats?.totalLoads} icon={Package} accent="amber" />
          <StatChip label="Bids" value={stats?.totalBids} icon={ClipboardList} accent="violet" />
          <StatChip label="Docs to Review" value={stats?.driversWithDocs} icon={FileText} accent="rose" />
        </div>
      )}

      {/* Trends chart */}
      <div className="mt-6">
        <AdminAnalyticsPanel />
      </div>

      {/* Platform insights */}
      <div className="mt-8">
        <SectionLabel>Platform Insights</SectionLabel>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <TopCompaniesCard companies={insights?.topCompanies ?? []} isLoading={insightsLoading} />
          <TopDriversCard drivers={insights?.topDrivers ?? []} isLoading={insightsLoading} />
          <TopLanesCard lanes={insights?.topLanes ?? []} isLoading={insightsLoading} />
        </div>
      </div>

      {/* Activity + quick actions */}
      <div className="mt-8">
        <SectionLabel>Activity & Quick Actions</SectionLabel>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <ActivityCard activity={insights?.activity} isLoading={insightsLoading} />
          </div>
          <div className="flex flex-col gap-4">
            <DynamicCard className="rounded-2xl ring-1 ring-foreground/10" noBorder>
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10 shrink-0">
                  <FolderCheck className="h-4.5 w-4.5 text-sky-600 dark:text-sky-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm mb-1">Document Review</h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    Review insurance certs & approval requests.
                  </p>
                  <Button asChild size="sm" className="w-full">
                    <Link to={RoutePath.AdminDocuments}>
                      Open
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            </DynamicCard>

            <DynamicCard className="rounded-2xl ring-1 ring-foreground/10" noBorder>
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 shrink-0">
                  <UserCog className="h-4.5 w-4.5 text-violet-600 dark:text-violet-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm mb-1">User Management</h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    Browse users sorted by registration date.
                  </p>
                  <Button variant="outline" asChild size="sm" className="w-full">
                    <Link to={RoutePath.AdminUsers}>
                      View Users
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            </DynamicCard>
          </div>
        </div>
      </div>

      {/* Documents */}
      <div className="mt-8">
        <SectionLabel>Documents</SectionLabel>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <DynamicCard
            title="Recent Rate Confirmations"
            action={
              <Button variant="outline" size="sm" asChild>
                <Link to={RoutePath.AdminRateConfirmations}>View All</Link>
              </Button>
            }
            className="rounded-2xl ring-1 ring-foreground/10"
            noBorder
          >
            {rcLoading && !statsLoading ? (
              <DocListSkeleton />
            ) : !rcLoading && recentRc.length === 0 ? (
              <p className="text-sm text-muted-foreground italic px-1">
                No rate confirmations yet.
              </p>
            ) : (
              <div className="space-y-1">
                {recentRc.map((bid) => (
                  <DocRowItem key={bid._id} row={bid}>
                    {bid.rateConfirmationUrl && (
                      <a href={bid.rateConfirmationUrl} target="_blank" rel="noopener noreferrer">
                        <Badge variant="outline" className="gap-1 cursor-pointer hover:bg-muted">
                          <ShieldCheck className="h-3 w-3" />
                          PDF
                        </Badge>
                      </a>
                    )}
                  </DocRowItem>
                ))}
              </div>
            )}
          </DynamicCard>

          <DynamicCard
            title="Recent Bills of Lading"
            action={
              <Button variant="outline" size="sm" asChild>
                <Link to={RoutePath.AdminBillOfLading}>View All</Link>
              </Button>
            }
            className="rounded-2xl ring-1 ring-foreground/10"
            noBorder
          >
            {bolLoading && !statsLoading ? (
              <DocListSkeleton />
            ) : !bolLoading && recentBol.length === 0 ? (
              <p className="text-sm text-muted-foreground italic px-1">No bills of lading yet.</p>
            ) : (
              <div className="space-y-1">
                {recentBol.map((bid) => (
                  <DocRowItem key={bid._id} row={bid}>
                    {bid.signedBolUrl && (
                      <a href={bid.signedBolUrl} target="_blank" rel="noopener noreferrer">
                        <Badge variant="outline" className="gap-1 cursor-pointer hover:bg-muted">
                          <Stamp className="h-3 w-3" />
                          Signed
                        </Badge>
                      </a>
                    )}
                    {bid.bolUrl && (
                      <a href={bid.bolUrl} target="_blank" rel="noopener noreferrer">
                        <Badge variant="outline" className="gap-1 cursor-pointer hover:bg-muted">
                          <FileText className="h-3 w-3" />
                          BOL
                        </Badge>
                      </a>
                    )}
                  </DocRowItem>
                ))}
              </div>
            )}
          </DynamicCard>
        </div>
      </div>
    </PageShell>
  )
}
