import { useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { format } from 'date-fns'
import PageShell from '@/components/layout/PageShell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/shared/DataTable'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useRequiredMongoId } from '@/hooks/useAuth'
import {
  useGetAllReportsQuery,
  useUpdateReportStatusMutation,
} from '@/services/reportApi/reportSlice'
import type { AdminReport, ReportStatus, ReportType } from '@/services/reportApi/reportEnum'
import { AlertTriangle, Building2, RefreshCw, ShieldAlert, User } from 'lucide-react'

const STATUS_CONFIG: Record<ReportStatus, { label: string; cls: string }> = {
  under_review: {
    label: 'Under Review',
    cls: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400',
  },
  resolved: {
    label: 'Resolved',
    cls: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400',
  },
  dismissed: {
    label: 'Dismissed',
    cls: 'bg-muted text-muted-foreground border-border',
  },
}

const ENTITY_ICON = { company: Building2, driver: User }

type StatusFilter = 'all' | ReportStatus

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

function ReportStatusBadge({ status }: { status: ReportStatus }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <Badge
      variant="outline"
      className={cn('text-[10px] font-semibold uppercase tracking-wide', cfg.cls)}
    >
      {cfg.label}
    </Badge>
  )
}

function ReportTypeBadge({ type }: { type: ReportType }) {
  return type === 'fraud' ? (
    <Badge variant="destructive" className="text-xs gap-1">
      <ShieldAlert className="h-3 w-3" />
      Fraud
    </Badge>
  ) : (
    <Badge variant="outline" className="text-xs gap-1">
      <AlertTriangle className="h-3 w-3" />
      Inaccurate
    </Badge>
  )
}

const columns: ColumnDef<AdminReport>[] = [
  {
    id: 'reporter',
    header: 'Reporter',
    cell: ({ row }) => {
      const reporter = row.original.reporterId
      if (!reporter) return <span className="text-sm text-muted-foreground">Unknown</span>
      return (
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{reporter.name}</p>
          <p className="text-xs text-muted-foreground truncate">{reporter.email}</p>
        </div>
      )
    },
  },
  {
    accessorKey: 'type',
    header: 'Type',
    cell: ({ row }) => <ReportTypeBadge type={row.getValue<ReportType>('type')} />,
  },
  {
    id: 'target',
    header: 'Target',
    cell: ({ row }) => {
      const report = row.original
      const Icon = ENTITY_ICON[report.targetType]
      return (
        <div className="flex items-center gap-1.5 text-sm min-w-0">
          <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="truncate">{report.targetName}</span>
        </div>
      )
    },
  },
  {
    accessorKey: 'category',
    header: 'Category',
    meta: { responsive: 'md' },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <ReportStatusBadge status={row.getValue<ReportStatus>('status')} />,
  },
  {
    accessorKey: 'createdAt',
    header: 'Submitted',
    cell: ({ row }) => format(new Date(row.getValue<string>('createdAt')), 'MMM d, yyyy'),
    meta: { responsive: 'lg' },
  },
]

export default function AdminReports() {
  const adminId = useRequiredMongoId()
  const { data: reports = [], isLoading, isFetching, refetch } = useGetAllReportsQuery()
  const [updateStatus, { isLoading: isUpdating }] = useUpdateReportStatusMutation()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const filters: { key: StatusFilter; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: reports.length },
    {
      key: 'under_review',
      label: 'Under Review',
      count: reports.filter((r) => r.status === 'under_review').length,
    },
    {
      key: 'resolved',
      label: 'Resolved',
      count: reports.filter((r) => r.status === 'resolved').length,
    },
    {
      key: 'dismissed',
      label: 'Dismissed',
      count: reports.filter((r) => r.status === 'dismissed').length,
    },
  ]

  const visibleReports =
    statusFilter === 'all' ? reports : reports.filter((r) => r.status === statusFilter)

  return (
    <PageShell
      title="Reports"
      subtitle="Fraud and inaccurate-details reports submitted by companies and drivers."
      stickyBar={
        <div className="flex rounded-lg border border-border overflow-hidden w-fit">
          {filters.map((f) => (
            <Button
              key={f.key}
              variant="ghost"
              size="sm"
              onClick={() => setStatusFilter(f.key)}
              className={cn(
                'rounded-none border-0',
                statusFilter === f.key ? 'filter-btn-active' : 'filter-btn-inactive'
              )}
            >
              {f.label} ({f.count})
            </Button>
          ))}
        </div>
      }
      actions={
        <Button
          variant="outline"
          size="icon"
          onClick={refetch}
          disabled={isFetching}
          title="Refresh"
        >
          <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
        </Button>
      }
    >
      {isLoading ? (
        <div className="rounded-xl border">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3 border-b last:border-b-0">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-4 w-24 hidden md:block" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          ))}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={visibleReports}
          getId={(report) => report._id}
          drawerTitle={(report) => report.targetName}
          drawerFields={[
            {
              label: 'Reporter',
              renderValue: (r) =>
                r.reporterId ? `${r.reporterId.name} (${r.reporterId.email})` : 'Unknown',
            },
            {
              label: 'Type',
              renderValue: (r) => (r.type === 'fraud' ? 'Fraud' : 'Inaccurate Details'),
            },
            {
              label: 'Target',
              renderValue: (r) => `${r.targetName} · ${r.targetType}`,
            },
            { label: 'Category', renderValue: (r) => r.category },
            { label: 'Description', renderValue: (r) => r.description },
            { label: 'Status', renderValue: (r) => STATUS_CONFIG[r.status].label },
            { label: 'Submitted', renderValue: (r) => formatDate(r.createdAt) },
          ]}
          drawerFooter={(report, { onClose }) => (
            <div className="flex w-full items-center justify-end gap-2">
              {report.status !== 'under_review' && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isUpdating}
                  onClick={() =>
                    updateStatus({ reportId: report._id, status: 'under_review', adminId })
                  }
                >
                  Reopen
                </Button>
              )}
              {report.status !== 'dismissed' && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isUpdating}
                  onClick={() =>
                    updateStatus({ reportId: report._id, status: 'dismissed', adminId })
                  }
                >
                  Dismiss
                </Button>
              )}
              {report.status !== 'resolved' && (
                <Button
                  size="sm"
                  disabled={isUpdating}
                  onClick={() =>
                    updateStatus({ reportId: report._id, status: 'resolved', adminId })
                  }
                >
                  Mark Resolved
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={onClose}>
                Close
              </Button>
            </div>
          )}
        />
      )}
    </PageShell>
  )
}
