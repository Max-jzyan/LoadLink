import DynamicCard from '@/components/layout/DynamicCard'
import PageShell from '@/components/layout/PageShell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RoutePath } from '@/config/routes'
import { cn } from '@/lib/utils'
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  ClipboardList,
  Loader2,
  ShieldAlert,
  User,
} from 'lucide-react'
import { useState } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { selectRole } from '@/services/authSlice'
import { useRequiredMongoId } from '@/hooks/useAuth'
import { useGetMyReportsQuery } from '@/services/reportApi/reportSlice'
import type { Report, ReportStatus } from '@/services/reportApi/reportEnum'

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

const ENTITY_ICON = { company: Building2, driver: User }

function ReportRow({ report }: { report: Report }) {
  const TypeIcon = report.type === 'fraud' ? ShieldAlert : ENTITY_ICON[report.targetType]

  return (
    <div className="flex items-start gap-3 py-3 border-b last:border-b-0">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
        <TypeIcon
          className={cn(
            'h-4 w-4',
            report.type === 'fraud' ? 'text-red-500' : 'text-muted-foreground'
          )}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{report.targetName}</span>
          <ReportStatusBadge status={report.status} />
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {report.type === 'fraud' ? 'Fraud report' : 'Inaccurate details'} · {report.category} ·
          Submitted {formatDate(report.createdAt)}
        </p>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">
          {report.description}
        </p>
      </div>
    </div>
  )
}

export default function ReportHub() {
  const role = useSelector(selectRole)
  const isCompany = role === 'company'
  const navigate = useNavigate()
  const userId = useRequiredMongoId()
  const { data: reports = [], isLoading } = useGetMyReportsQuery(userId)
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
  ]

  const visibleReports =
    statusFilter === 'all' ? reports : reports.filter((r) => r.status === statusFilter)

  return (
    <PageShell
      title="My Reports"
      subtitle="Track your submitted reports and their review status."
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
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(RoutePath.BlocklistPreferences)}
          >
            <ArrowLeft className="h-4 w-4" />
            Blocklist
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="bg-red-500 hover:bg-red-600 text-white"
            onClick={() => navigate(RoutePath.ReportFraud)}
          >
            <ShieldAlert className="h-4 w-4" />
            Report Fraud
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate(RoutePath.ReportInaccurate)}>
            <AlertTriangle className="h-4 w-4" />
            Report Inaccurate Details
          </Button>
        </>
      }
    >
      <DynamicCard
        title={
          visibleReports.length > 0
            ? `${visibleReports.length} Report${visibleReports.length !== 1 ? 's' : ''}`
            : 'Reports'
        }
      >
        {isLoading && (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        {!isLoading && visibleReports.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <ClipboardList className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              {statusFilter === 'all'
                ? 'No reports submitted yet.'
                : `No ${STATUS_CONFIG[statusFilter as ReportStatus].label.toLowerCase()} reports.`}
            </p>
            {statusFilter === 'all' && (
              <p className="text-xs text-muted-foreground max-w-sm">
                If a {isCompany ? 'driver' : 'company'} has committed fraud or posted inaccurate
                details, use the buttons above to submit a report.
              </p>
            )}
          </div>
        )}
        {!isLoading &&
          visibleReports.map((report) => <ReportRow key={report._id} report={report} />)}
      </DynamicCard>
    </PageShell>
  )
}
