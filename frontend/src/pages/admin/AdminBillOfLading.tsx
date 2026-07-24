import { useState } from 'react'
import PageShell from '@/components/layout/PageShell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  useListBillsOfLadingQuery,
  type BillOfLadingBid,
} from '@/services/adminApi/adminSlice'
import { Search, Download, RefreshCw, FileText, Stamp, ShieldCheck } from 'lucide-react'
import { format } from 'date-fns'
import { Skeleton } from '@/components/ui/skeleton'

function BolRow({ bid }: { bid: BillOfLadingBid }) {
  const load = typeof bid.loadId === 'object' ? bid.loadId : null
  const driver = typeof bid.driverId === 'object' ? bid.driverId : null

  return (
    <div className="rounded-xl border p-4 space-y-2 hover:bg-muted/20 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {load ? (
            <>
              <p className="font-medium text-sm">
                {load.originAddress.split(',')[0]} → {load.destinationAddress.split(',')[0]}
              </p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(load.pickupTime), 'MMM d, yyyy')} · {load.commodity}
              </p>
            </>
          ) : (
            <p className="font-medium text-sm text-muted-foreground">
              Load #{String(bid.loadId).slice(-6).toUpperCase()}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            Driver: {driver?.name ?? String(bid.driverId).slice(-6)} ·{' '}
            <span className="font-medium">${bid.amount.toFixed(2)}</span>
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {bid.signedBolUrl && (
            <a href={bid.signedBolUrl} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1">
                <Stamp className="h-3.5 w-3.5" />
                Signed Copy
              </Button>
            </a>
          )}
          {bid.bolUrl && (
            <a href={bid.bolUrl} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1">
                <Download className="h-3.5 w-3.5" />
                Download
              </Button>
            </a>
          )}
        </div>
      </div>

      {bid.acceptedAt && (
        <p className="text-xs text-muted-foreground">
          Accepted {format(new Date(bid.acceptedAt), 'MMM d, yyyy HH:mm')}
        </p>
      )}

      <div className="flex items-center gap-2">
        {!bid.bolUrl && (
          <Badge variant="destructive" className="text-xs">
            PDF not generated
          </Badge>
        )}
        {bid.signedBolUrl ? (
          <Badge variant="outline" className="gap-1 text-xs">
            <ShieldCheck className="h-3 w-3" />
            Shipper-signed copy on file
          </Badge>
        ) : (
          bid.bolUrl && (
            <Badge variant="secondary" className="text-xs">
              Awaiting signed copy
            </Badge>
          )
        )}
      </div>
    </div>
  )
}

export default function AdminBillOfLading() {
  const { data: bids = [], isLoading, refetch, isFetching } = useListBillsOfLadingQuery()
  const [search, setSearch] = useState('')

  const filtered = bids.filter((b) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    const load = typeof b.loadId === 'object' ? b.loadId : null
    const driver = typeof b.driverId === 'object' ? b.driverId : null
    return (
      (load?.originAddress.toLowerCase().includes(q) ?? false) ||
      (load?.destinationAddress.toLowerCase().includes(q) ?? false) ||
      (load?.commodity.toLowerCase().includes(q) ?? false) ||
      (driver?.name.toLowerCase().includes(q) ?? false) ||
      (driver?.email.toLowerCase().includes(q) ?? false)
    )
  })

  return (
    <PageShell
      title="Bills of Lading"
      subtitle={`${filtered.length} PDFs`}
      actions={
        <Button variant="outline" size="sm" onClick={refetch} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-1 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      }
    >
      <div className="mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by route, commodity, driver…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      )}
      {!isLoading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <FileText className="h-10 w-10 mb-3 opacity-20" />
          <p className="text-sm">{search ? 'No matches.' : 'No bills of lading yet.'}</p>
        </div>
      )}
      {!isLoading && filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map((bid) => (
            <BolRow key={bid._id} bid={bid} />
          ))}
        </div>
      )}
    </PageShell>
  )
}
