import { useState } from 'react'
import PageShell from '@/components/layout/PageShell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  useListAdminDriversQuery,
  useApproveInsuranceCertMutation,
  useRejectInsuranceCertMutation,
  useApproveCertDocMutation,
  useRejectCertDocMutation,
  useLazyGetDocumentDownloadUrlQuery,
  type AdminDriver,
  type InsuranceCert,
  type CertDoc,
} from '@/services/adminApi/adminSlice'
import {
  CheckCircle,
  XCircle,
  FileText,
  ExternalLink,
  Search,
  ChevronDown,
  ChevronRight,
  Clock,
  AlertTriangle,
} from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import { Skeleton } from '@/components/ui/skeleton'

/** View button that fetches a short-lived presigned S3 URL before opening. */
function DocViewButton({ docKey }: { docKey: string }) {
  const [getUrl, { isLoading }] = useLazyGetDocumentDownloadUrlQuery()

  async function handleView() {
    const result = await getUrl(docKey)
    if (result.data?.url) window.open(result.data.url, '_blank', 'noopener,noreferrer')
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 text-xs gap-1"
      onClick={handleView}
      disabled={isLoading}
    >
      <ExternalLink className="h-3 w-3" />
      {isLoading ? 'Loading…' : 'View'}
    </Button>
  )
}

function statusBadge(status?: string) {
  if (status === 'approved')
    return (
      <Badge variant="default" className="text-xs">
        Verified
      </Badge>
    )
  if (status === 'rejected')
    return (
      <Badge variant="destructive" className="text-xs">
        Rejected
      </Badge>
    )
  return (
    <Badge variant="secondary" className="text-xs">
      Pending Review
    </Badge>
  )
}

type ExpiryState = 'expired' | 'expiring' | 'ok' | null

/** Compute expiry state relative to today */
function getExpiryState(expiresAt?: string | null): ExpiryState {
  if (!expiresAt) return null
  const days = differenceInDays(new Date(expiresAt), new Date())
  if (days < 0) return 'expired'
  if (days <= 30) return 'expiring'
  return 'ok'
}

function expiryBadge(expiresAt?: string | null) {
  const state = getExpiryState(expiresAt)
  if (!expiresAt || state === 'ok') return null
  if (state === 'expired')
    return (
      <Badge variant="destructive" className="text-xs gap-1">
        <AlertTriangle className="h-3 w-3" />
        Expired
      </Badge>
    )
  return (
    <Badge variant="outline" className="text-xs gap-1 border-amber-500/60 text-amber-600">
      <Clock className="h-3 w-3" />
      Expiring Soon
    </Badge>
  )
}

function InsuranceCertRow({
  cert,
  idx,
  driverId,
}: {
  cert: InsuranceCert
  idx: number
  driverId: string
}) {
  const [approve, { isLoading: approving }] = useApproveInsuranceCertMutation()
  const [reject, { isLoading: rejecting }] = useRejectInsuranceCertMutation()
  const [rejecting2, setRejecting2] = useState(false)
  const [reason, setReason] = useState('')
  const expired = new Date(cert.expiresAt) < new Date()
  const busy = approving || rejecting

  return (
    <div className="rounded-lg border p-3 space-y-2">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium">{cert.insurer}</p>
            {statusBadge(cert.verificationStatus)}
          </div>
          <p className="text-xs text-muted-foreground">Policy: {cert.policyNumber}</p>
          <p className={`text-xs mt-0.5 ${expired ? 'text-destructive' : 'text-muted-foreground'}`}>
            Expires: {format(new Date(cert.expiresAt), 'MMM d, yyyy')}
            {expired && ' (EXPIRED)'}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <DocViewButton docKey={cert.key} />
          {cert.verificationStatus !== 'approved' && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1 border-green-500/50 text-green-600 hover:bg-green-50"
              onClick={() => approve({ driverId, idx })}
              disabled={busy}
            >
              <CheckCircle className="h-3 w-3" />
              Approve
            </Button>
          )}
          {cert.verificationStatus !== 'rejected' && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1 border-destructive/50 text-destructive hover:bg-destructive/5"
              onClick={() => setRejecting2((v) => !v)}
              disabled={busy}
            >
              <XCircle className="h-3 w-3" />
              Reject
            </Button>
          )}
        </div>
      </div>
      {rejecting2 && (
        <div className="flex gap-2 items-center">
          <Input
            className="h-8 text-xs"
            placeholder="Rejection reason (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <Button
            size="sm"
            className="h-8 text-xs shrink-0 bg-destructive hover:bg-destructive/90"
            onClick={() => {
              reject({ driverId, idx, reason: reason || undefined })
              setRejecting2(false)
              setReason('')
            }}
          >
            Confirm
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-xs shrink-0"
            onClick={() => setRejecting2(false)}
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  )
}

function CertDocRow({ doc, idx, driverId }: { doc: CertDoc; idx: number; driverId: string }) {
  const [approve, { isLoading: approving }] = useApproveCertDocMutation()
  const [reject, { isLoading: rejecting }] = useRejectCertDocMutation()
  const [rejecting2, setRejecting2] = useState(false)
  const [reason, setReason] = useState('')
  const busy = approving || rejecting
  const expiryState = getExpiryState(doc.expiresAt)

  return (
    <div className="rounded-lg border p-3 space-y-2">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium">{doc.name}</p>
            {statusBadge(doc.verificationStatus)}
            {expiryBadge(doc.expiresAt)}
          </div>
          <p className="text-xs text-muted-foreground">
            Uploaded {format(new Date(doc.uploadedAt), 'MMM d, yyyy')}
          </p>
          {doc.expiresAt && (
            <p
              className={`text-xs mt-0.5 ${
                expiryState === 'expired'
                  ? 'text-destructive'
                  : expiryState === 'expiring'
                    ? 'text-amber-600'
                    : 'text-muted-foreground'
              }`}
            >
              Expires: {format(new Date(doc.expiresAt), 'MMM d, yyyy')}
              {expiryState === 'expired' && ' (EXPIRED)'}
            </p>
          )}
          {doc.reviewNotes && doc.verificationStatus === 'rejected' && (
            <p className="text-xs text-destructive mt-0.5">Reason: {doc.reviewNotes}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <DocViewButton docKey={doc.key} />
          {doc.verificationStatus !== 'approved' && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1 border-green-500/50 text-green-600 hover:bg-green-50"
              onClick={() => approve({ driverId, idx })}
              disabled={busy}
            >
              <CheckCircle className="h-3 w-3" />
              Approve
            </Button>
          )}
          {doc.verificationStatus !== 'rejected' && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1 border-destructive/50 text-destructive hover:bg-destructive/5"
              onClick={() => setRejecting2((v) => !v)}
              disabled={busy}
            >
              <XCircle className="h-3 w-3" />
              Reject
            </Button>
          )}
        </div>
      </div>
      {rejecting2 && (
        <div className="flex gap-2 items-center">
          <Input
            className="h-8 text-xs"
            placeholder="Rejection reason (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <Button
            size="sm"
            className="h-8 text-xs shrink-0 bg-destructive hover:bg-destructive/90"
            onClick={() => {
              reject({ driverId, idx, reason: reason || undefined })
              setRejecting2(false)
              setReason('')
            }}
          >
            Confirm
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-xs shrink-0"
            onClick={() => setRejecting2(false)}
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  )
}

function DriverRowSkeleton() {
  return (
    <div className="rounded-xl border overflow-hidden">
      <div className="w-full flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="min-w-0 space-y-2 flex-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        </div>
        <Skeleton className="h-4 w-4 shrink-0 ml-2" />
      </div>
    </div>
  )
}

/** Count how many of a driver's docs are expired or expiring-soon */
export function driverExpiryStats(driver: AdminDriver) {
  const now = new Date()
  const cutoff = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  let expired = 0
  let expiringSoon = 0
  const allExpiries = [
    ...(driver.insuranceCertificates ?? []).map((c) => c.expiresAt),
    ...(driver.certificationDocuments ?? []).map((d) => d.expiresAt),
  ]
  for (const e of allExpiries) {
    if (!e) continue
    const d = new Date(e)
    if (d < now) expired++
    else if (d <= cutoff) expiringSoon++
  }
  return { expired, expiringSoon }
}

function DriverRow({ driver }: { driver: AdminDriver }) {
  const [expanded, setExpanded] = useState(false)
  const insCount = driver.insuranceCertificates?.length ?? 0
  const certCount = driver.certificationDocuments?.length ?? 0
  const totalDocs = insCount + certCount
  const { expired, expiringSoon } = driverExpiryStats(driver)

  return (
    <div className="rounded-xl border overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{driver.name}</p>
            <p className="text-xs text-muted-foreground truncate">{driver.email}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {driver.mcNumber && (
              <Badge variant="outline" className="text-xs">
                MC# {driver.mcNumber}
              </Badge>
            )}
            {driver.dotNumber && (
              <Badge variant="outline" className="text-xs">
                DOT# {driver.dotNumber}
              </Badge>
            )}
            <Badge variant={totalDocs > 0 ? 'default' : 'secondary'} className="text-xs">
              <FileText className="h-3 w-3 mr-1" />
              {totalDocs} doc{totalDocs !== 1 ? 's' : ''}
            </Badge>
            {expired > 0 && (
              <Badge variant="destructive" className="text-xs gap-1">
                <AlertTriangle className="h-3 w-3" />
                {expired} expired
              </Badge>
            )}
            {expiringSoon > 0 && expired === 0 && (
              <Badge variant="outline" className="text-xs gap-1 border-amber-500/60 text-amber-600">
                <Clock className="h-3 w-3" />
                {expiringSoon} expiring
              </Badge>
            )}
          </div>
        </div>
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t bg-muted/20">
          {/* Insurance Certificates */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-3 mb-2">
              Insurance Certificates
            </p>
            {insCount === 0 ? (
              <p className="text-sm text-muted-foreground italic">None uploaded.</p>
            ) : (
              driver.insuranceCertificates.map((cert, i) => (
                <InsuranceCertRow key={i} cert={cert} idx={i} driverId={driver._id} />
              ))
            )}
          </div>

          {/* Certification Documents */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Certification Documents
            </p>
            {certCount === 0 ? (
              <p className="text-sm text-muted-foreground italic">None uploaded.</p>
            ) : (
              driver.certificationDocuments.map((doc, i) => (
                <CertDocRow key={i} doc={doc} idx={i} driverId={driver._id} />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

type ExpiryFilter = 'all' | 'expiring' | 'expired'

export default function AdminDocuments() {
  const { data: drivers = [], isLoading } = useListAdminDriversQuery()
  const [search, setSearch] = useState('')
  const [expiryFilter, setExpiryFilter] = useState<ExpiryFilter>('all')

  const filtered = drivers.filter((d) => {
    // text search
    if (search) {
      const q = search.toLowerCase()
      const matchesText =
        d.name.toLowerCase().includes(q) ||
        d.email.toLowerCase().includes(q) ||
        d.mcNumber?.toLowerCase().includes(q) ||
        d.dotNumber?.toLowerCase().includes(q)
      if (!matchesText) return false
    }
    // expiry filter
    if (expiryFilter !== 'all') {
      const { expired, expiringSoon } = driverExpiryStats(d)
      if (expiryFilter === 'expired' && expired === 0) return false
      if (expiryFilter === 'expiring' && expiringSoon === 0) return false
    }
    return true
  })

  const expiredCount = drivers.filter((d) => driverExpiryStats(d).expired > 0).length
  const expiringCount = drivers.filter((d) => driverExpiryStats(d).expiringSoon > 0).length

  const filterTabs: { key: ExpiryFilter; label: string; count?: number }[] = [
    { key: 'all', label: 'All' },
    {
      key: 'expiring',
      label: 'Expiring Soon',
      count: expiringCount,
    },
    { key: 'expired', label: 'Expired', count: expiredCount },
  ]

  return (
    <PageShell
      title="Document Review"
      subtitle="Review driver insurance certificates and certification documents"
    >
      {/* Search + filter bar */}
      <div className="mb-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by name, email, MC# or DOT#…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Badge variant="secondary">{filtered.length} drivers</Badge>
        </div>

        {/* Expiry filter tabs */}
        <div className="flex items-center gap-1">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setExpiryFilter(tab.key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                expiryFilter === tab.key
                  ? tab.key === 'expired'
                    ? 'bg-destructive text-destructive-foreground'
                    : tab.key === 'expiring'
                      ? 'bg-amber-100 text-amber-700 border border-amber-300'
                      : 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {tab.key === 'expired' && <AlertTriangle className="h-3 w-3" />}
              {tab.key === 'expiring' && <Clock className="h-3 w-3" />}
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                    expiryFilter === tab.key
                      ? 'bg-white/20'
                      : tab.key === 'expired'
                        ? 'bg-destructive/10 text-destructive'
                        : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <DriverRowSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground italic text-center py-8">
              No drivers found.
            </p>
          ) : (
            filtered.map((driver) => <DriverRow key={driver._id} driver={driver} />)
          )}
        </div>
      )}
    </PageShell>
  )
}
