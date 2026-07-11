import { useMemo, useState } from 'react'
import PageShell from '@/components/layout/PageShell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useRequiredMongoId } from '@/hooks/useAuth'
import { api } from '@/services/api'
import { LoadTag } from '@/services/apiTypes'
import { AUCTION_STATUSES } from '@/services/auctionApi/auctionEnum'
import { Search, Gavel, ArrowRight, Loader2, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { RoutePath } from '@/config/routes'
import { format } from 'date-fns'

interface AuctionEntry {
  _id: string
  companyId: string
  loadId: {
    _id: string
    originAddress: string
    destinationAddress: string
    pickupTime: string
    dropoffTime: string
    commodity: string
    truckType: string
    status: string
  } | string
  status: (typeof AUCTION_STATUSES)[keyof typeof AUCTION_STATUSES]
  currentPrice: number
  startPrice: number
  capPrice: number
  currency: string
  expiresAt: string
  createdAt: string
  bidCount?: number
}

function statusBadge(status: string) {
  switch (status) {
    case AUCTION_STATUSES.Active:
      return <Badge className="bg-green-500/15 text-green-700 border-green-500/30 dark:text-green-400">Live</Badge>
    case AUCTION_STATUSES.Closed:
      return <Badge variant="secondary">Closed</Badge>
    case AUCTION_STATUSES.Cancelled:
      return <Badge variant="destructive">Cancelled</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

// Inline RTK Query endpoint for company auctions
const companyAuctionsApi = api.injectEndpoints({
  endpoints: (build) => ({
    getCompanyAuctions: build.query<AuctionEntry[], string>({
      query: (companyId) => `company/${companyId}/auctions`,
      providesTags: [{ type: LoadTag.Auction, id: 'COMPANY_LIST' }],
    }),
  }),
  overrideExisting: false,
})

const { useGetCompanyAuctionsQuery } = companyAuctionsApi

export default function CompanyAuctions() {
  const companyId = useRequiredMongoId()
  const [search, setSearch] = useState('')

  const {
    data: auctions = [],
    isLoading,
    isFetching,
    refetch,
  } = useGetCompanyAuctionsQuery(companyId, { skip: !companyId })

  const filtered = useMemo(() => {
    if (!search.trim()) return auctions
    const q = search.toLowerCase()
    return auctions.filter((a) => {
      const load = typeof a.loadId === 'object' ? a.loadId : null
      if (!load) return false
      return (
        load.originAddress.toLowerCase().includes(q) ||
        load.destinationAddress.toLowerCase().includes(q) ||
        load.commodity.toLowerCase().includes(q) ||
        a.status.toLowerCase().includes(q)
      )
    })
  }, [auctions, search])

  const live = filtered.filter((a) => a.status === AUCTION_STATUSES.Active).length
  const closed = filtered.filter((a) => a.status === AUCTION_STATUSES.Closed).length

  return (
    <PageShell
      title="My Auctions"
      subtitle={`${live} live · ${closed} closed`}
      actions={
        <Button variant="outline" size="sm" onClick={refetch} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-1 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      }
    >
      {/* Search */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by route, commodity…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Badge variant="secondary">{filtered.length} auctions</Badge>
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
      {!isLoading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Gavel className="h-10 w-10 mb-3 opacity-30" />
          <p className="text-sm">{search ? 'No auctions match your search.' : 'No auctions yet.'}</p>
        </div>
      )}
      {!isLoading && filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map((auction) => {
            const load = typeof auction.loadId === 'object' ? auction.loadId : null
            const loadId = load?._id ?? String(auction.loadId)

            return (
              <div
                key={auction._id}
                className="rounded-xl border bg-card p-4 flex items-center gap-4 hover:bg-muted/30 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  {load ? (
                    <>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-medium text-sm truncate">
                          {load.originAddress.split(',')[0]}
                        </span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="font-medium text-sm truncate">
                          {load.destinationAddress.split(',')[0]}
                        </span>
                        {statusBadge(auction.status)}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                        <span>{load.commodity}</span>
                        <span>{load.truckType}</span>
                        <span>Pickup: {format(new Date(load.pickupTime), 'MMM d')}</span>
                        {auction.bidCount !== undefined && (
                          <span>{auction.bidCount} bid{auction.bidCount !== 1 ? 's' : ''}</span>
                        )}
                      </div>
                    </>
                  ) : (
                    <p className="text-sm font-medium text-muted-foreground">
                      Load #{String(auction.loadId).slice(-6).toUpperCase()}
                    </p>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <p className="font-semibold text-sm">
                    {auction.currency} ${auction.currentPrice.toFixed(0)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Cap: ${auction.capPrice.toFixed(0)}
                  </p>
                </div>

                {auction.status === AUCTION_STATUSES.Active && (
                  <Button size="sm" asChild>
                    <Link to={`${RoutePath.AuctionLive}/${loadId}`}>
                      <Gavel className="h-3.5 w-3.5 mr-1.5" />
                      View Live
                    </Link>
                  </Button>
                )}
                {auction.status !== AUCTION_STATUSES.Active && load && (
                  <Button size="sm" variant="outline" asChild>
                    <Link to={`/loads/${loadId}`}>Details</Link>
                  </Button>
                )}
              </div>
              )
            })}
          </div>
        )}
      </PageShell>
  )
}
