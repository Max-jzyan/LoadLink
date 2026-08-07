import { useState, useEffect } from 'react'
import PageShell from '@/components/layout/PageShell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  useListRateConfirmationsQuery,
  useGenerateRateConfirmationMutation,
  type RateConfirmationBid,
} from '@/services/adminApi/adminSlice'
import { Search, Download, RefreshCw, FileText, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { showSuccess, showError } from '@/lib/toast'
import { Skeleton } from '@/components/ui/skeleton'

function RcRow({ bid }: { bid: RateConfirmationBid }) {
  const [generate, { isLoading, isSuccess, data, isError, error }] =
    useGenerateRateConfirmationMutation()
  const load = typeof bid.loadId === 'object' ? bid.loadId : null
  const driver = typeof bid.driverId === 'object' ? bid.driverId : null

  useEffect(() => {
    if (isSuccess && data?.url) {
      window.open(data.url, '_blank')
      showSuccess('Rate confirmation regenerated')
    }
  }, [isSuccess, data])

  useEffect(() => {
    if (isError) {
      showError('Failed to regenerate rate confirmation')
    }
  }, [isError, error])

  function handleRegenerate() {
    const loadId = load?._id ?? String(bid.loadId)
    generate({ loadId, bidId: bid._id })
  }

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
          {bid.rateConfirmationUrl && (
            <a href={bid.rateConfirmationUrl} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1">
                <Download className="h-3.5 w-3.5" />
                Download
              </Button>
            </a>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-xs gap-1"
            onClick={handleRegenerate}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Regen
          </Button>
        </div>
      </div>

      {bid.acceptedAt && (
        <p className="text-xs text-muted-foreground">
          Accepted {format(new Date(bid.acceptedAt), 'MMM d, yyyy HH:mm')}
        </p>
      )}
      {!bid.rateConfirmationUrl && (
        <Badge variant="destructive" className="text-xs">
          PDF not generated
        </Badge>
      )}
    </div>
  )
}

export default function AdminRateConfirmations() {
  const { data: bids = [], isLoading, refetch, isFetching } = useListRateConfirmationsQuery()
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
      title="Rate Confirmations"
      subtitle={`${filtered.length} PDFs`}
      actions={
        <Button variant="outline" size="sm" onClick={refetch} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-1 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      }
    >
      <div className="mb-4" data-tour="admin-doc-search">
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
          <p className="text-sm">{search ? 'No matches.' : 'No rate confirmations yet.'}</p>
        </div>
      )}
      {!isLoading && filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map((bid) => (
            <RcRow key={bid._id} bid={bid} />
          ))}
        </div>
      )}
    </PageShell>
  )
}
