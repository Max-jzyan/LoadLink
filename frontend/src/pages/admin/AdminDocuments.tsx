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
  Loader2,
  Search,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { format } from 'date-fns'

/** View button that fetches a short-lived presigned S3 URL before opening. */
function DocViewButton({ docKey }: { docKey: string }) {
  const [getUrl, { isLoading }] = useLazyGetDocumentDownloadUrlQuery()

  async function handleView() {
    const result = await getUrl(docKey)
    if (result.data?.url) window.open(result.data.url, '_blank', 'noopener,noreferrer')
  }

  return (
    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={handleView} disabled={isLoading}>
      <ExternalLink className="h-3 w-3" />
      {isLoading ? 'Loading…' : 'View'}
    </Button>
  )
}

function statusBadge(status?: string) {
  if (status === 'approved') return <Badge variant="default" className="text-xs">Verified</Badge>
  if (status === 'rejected') return <Badge variant="destructive" className="text-xs">Rejected</Badge>
  return <Badge variant="secondary" className="text-xs">Pending Review</Badge>
}

function InsuranceCertRow({ cert, idx, driverId }: { cert: InsuranceCert; idx: number; driverId: string }) {
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
            Expires: {format(new Date(cert.expiresAt), 'MMM d, yyyy')}{expired && ' (EXPIRED)'}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <DocViewButton docKey={cert.key} />
          {cert.verificationStatus !== 'approved' && (
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-green-500/50 text-green-600 hover:bg-green-50"
              onClick={() => approve({ driverId, idx })} disabled={busy}>
              <CheckCircle className="h-3 w-3" />
              Approve
            </Button>
          )}
          {cert.verificationStatus !== 'rejected' && (
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-destructive/50 text-destructive hover:bg-destructive/5"
              onClick={() => setRejecting2((v) => !v)} disabled={busy}>
              <XCircle className="h-3 w-3" />
              Reject
            </Button>
          )}
        </div>
      </div>
      {rejecting2 && (
        <div className="flex gap-2 items-center">
          <Input className="h-8 text-xs" placeholder="Rejection reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} />
          <Button size="sm" className="h-8 text-xs shrink-0 bg-destructive hover:bg-destructive/90"
            onClick={() => { reject({ driverId, idx, reason: reason || undefined }); setRejecting2(false); setReason('') }}>
            Confirm
          </Button>
          <Button size="sm" variant="ghost" className="h-8 text-xs shrink-0" onClick={() => setRejecting2(false)}>Cancel</Button>
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

  return (
    <div className="rounded-lg border p-3 space-y-2">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium">{doc.name}</p>
            {statusBadge(doc.verificationStatus)}
          </div>
          <p className="text-xs text-muted-foreground">
            Uploaded {format(new Date(doc.uploadedAt), 'MMM d, yyyy')}
          </p>
          {doc.reviewNotes && doc.verificationStatus === 'rejected' && (
            <p className="text-xs text-destructive mt-0.5">Reason: {doc.reviewNotes}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <DocViewButton docKey={doc.key} />
          {doc.verificationStatus !== 'approved' && (
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-green-500/50 text-green-600 hover:bg-green-50"
              onClick={() => approve({ driverId, idx })} disabled={busy}>
              <CheckCircle className="h-3 w-3" />
              Approve
            </Button>
          )}
          {doc.verificationStatus !== 'rejected' && (
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-destructive/50 text-destructive hover:bg-destructive/5"
              onClick={() => setRejecting2((v) => !v)} disabled={busy}>
              <XCircle className="h-3 w-3" />
              Reject
            </Button>
          )}
        </div>
      </div>
      {rejecting2 && (
        <div className="flex gap-2 items-center">
          <Input className="h-8 text-xs" placeholder="Rejection reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} />
          <Button size="sm" className="h-8 text-xs shrink-0 bg-destructive hover:bg-destructive/90"
            onClick={() => { reject({ driverId, idx, reason: reason || undefined }); setRejecting2(false); setReason('') }}>
            Confirm
          </Button>
          <Button size="sm" variant="ghost" className="h-8 text-xs shrink-0" onClick={() => setRejecting2(false)}>Cancel</Button>
        </div>
      )}
    </div>
  )
}

function DriverRow({ driver }: { driver: AdminDriver }) {
  const [expanded, setExpanded] = useState(false)
  const insCount = driver.insuranceCertificates?.length ?? 0
  const certCount = driver.certificationDocuments?.length ?? 0
  const totalDocs = insCount + certCount

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
          <div className="flex items-center gap-2 shrink-0">
            {driver.mcNumber && <Badge variant="outline" className="text-xs">MC# {driver.mcNumber}</Badge>}
            {driver.dotNumber && <Badge variant="outline" className="text-xs">DOT# {driver.dotNumber}</Badge>}
            <Badge variant={totalDocs > 0 ? 'default' : 'secondary'} className="text-xs">
              <FileText className="h-3 w-3 mr-1" />
              {totalDocs} doc{totalDocs !== 1 ? 's' : ''}
            </Badge>
          </div>
        </div>
        {expanded
          ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
          : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
        }
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t bg-muted/20">
          {/* Insurance Certificates */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-3 mb-2">Insurance Certificates</p>
            {insCount === 0
              ? <p className="text-sm text-muted-foreground italic">None uploaded.</p>
              : driver.insuranceCertificates.map((cert, i) => (
                  <InsuranceCertRow key={i} cert={cert} idx={i} driverId={driver._id} />
                ))
            }
          </div>

          {/* Certification Documents */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Certification Documents</p>
            {certCount === 0
              ? <p className="text-sm text-muted-foreground italic">None uploaded.</p>
              : driver.certificationDocuments.map((doc, i) => (
                  <CertDocRow key={i} doc={doc} idx={i} driverId={driver._id} />
                ))
            }
          </div>
        </div>
      )}
    </div>
  )
}

export default function AdminDocuments() {
  const { data: drivers = [], isLoading } = useListAdminDriversQuery()
  const [search, setSearch] = useState('')

  const filtered = drivers.filter((d) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      d.name.toLowerCase().includes(q) ||
      d.email.toLowerCase().includes(q) ||
      d.mcNumber?.toLowerCase().includes(q) ||
      d.dotNumber?.toLowerCase().includes(q)
    )
  })

  return (
    <PageShell title="Document Review" subtitle="Review driver insurance certificates and certification documents">
      <div className="mb-4 flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by name, email, MC# or DOT#…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Badge variant="secondary">{filtered.length} drivers</Badge>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground italic text-center py-8">No drivers found.</p>
          ) : (
            filtered.map((driver) => <DriverRow key={driver._id} driver={driver} />)
          )}
        </div>
      )}
    </PageShell>
  )
}
