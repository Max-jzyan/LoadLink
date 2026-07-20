import { Link, useParams } from 'react-router-dom'
import { Gavel, Trophy, WifiOff } from 'lucide-react'
import DynamicCard from '@/components/layout/DynamicCard'
import PageShell from '@/components/layout/PageShell'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RoutePath } from '@/config/routes'
import { Skeleton } from '@/components/ui/skeleton'
import AuctionControls from '@/components/auction/AuctionControls'
import BidList from '@/components/auction/BidList'
import DriverNameLink from '@/components/shared/DriverNameLink'
import LoadSummaryCard from '@/components/auction/LoadSummaryCard'
import PriceTracker from '@/components/auction/PriceTracker'
import ReopenAuctionDialog from '@/components/auction/ReopenAuctionDialog'
import Spinner from '@/components/shared/Spinner'
import { useEventSource } from '@/components/auction/useEventSource'
import { AUCTION_STATUSES, BID_STATUSES } from '@/services/auctionApi/auctionEnum'
import type { BidsStreamPayload, PriceStreamPayload } from '@/services/auctionApi/auctionEnum'
import { useAcceptBidMutation } from '@/services/auctionApi/auctionSlice'
import { useGetLoadQuery } from '@/services/loadApi/loadSlice'
import { setBreadcrumbLabel } from '@/services/breadcrumbSlice'
import { useDispatch } from 'react-redux'
import { useEffect } from 'react'
import { formatMoney } from '@/lib/format'
import NotFound from '@/pages/NotFound'

/**
 * Pass a load id in the URL: http://localhost:3000/auctionLive/<loadId>
 * Visiting /auctionLive with no id shows a "no auction selected" prompt.
 */
const MONGO_ID_RE = /^[a-f\d]{24}$/i

export default function AuctionLive() {
  const { loadId: loadIdParam } = useParams()
  const loadId = loadIdParam ?? ''

  // Only query when a valid ObjectId was provided in the URL
  const isValidId = !!loadIdParam && MONGO_ID_RE.test(loadIdParam)

  const { data: load, isLoading, isError } = useGetLoadQuery(loadId, { skip: !isValidId })

  const { data: bidsPayload, status: bidsStatus } = useEventSource<BidsStreamPayload>(
    isValidId ? `/api/auctions/${loadId}/bids` : null
  )
  const { data: pricePayload, status: priceStatus } = useEventSource<PriceStreamPayload>(
    isValidId ? `/api/auctions/${loadId}/price` : null
  )
  const dispatch = useDispatch()

  // Push a friendly origin → destination label into the breadcrumb store for the
  // live auction route (we already have the load). PageLayout reads it instead
  // of parsing the id out of the URL.
  useEffect(() => {
    if (isValidId && load) {
      const label = `${load.originAddress.split(',')[0].trim()} → ${load.destinationAddress
        .split(',')[0]
        .trim()}`
      dispatch(
        setBreadcrumbLabel({
          path: `/auctionLive/${loadId}`,
          label,
        })
      )
    }
  }, [isValidId, loadId, load, dispatch])

  const [acceptBid, { isLoading: accepting }] = useAcceptBidMutation()
  const companyName = load?.companyId?.name
  const companyId = load?.companyId?._id

  const bids = bidsPayload?.bids ?? []
  const bestBid = bids[0]

  // Derive auction state from SSE payload
  const liveEventType = pricePayload?.loadEventType ?? bidsPayload?.loadEventType

  const rawAuction = load?.auctionId ?? undefined
  const auction =
    rawAuction && liveEventType ? { ...rawAuction, status: liveEventType } : rawAuction

  const currentPrice = pricePayload?.currentPrice || auction?.currentPrice || 0

  const isAuctionOver =
    liveEventType === AUCTION_STATUSES.Closed || liveEventType === AUCTION_STATUSES.Cancelled
  const isCancelled = liveEventType === AUCTION_STATUSES.Cancelled

  const winnerBid = bids.find((b) => b.status === BID_STATUSES.Accepted)

  // If any SSE stream has lost its connection
  const sseDisconnected = bidsStatus === 'disconnected' || priceStatus === 'disconnected'

  // No load id in the URL — prompt the user to pick an auction instead of
  // silently defaulting to a seeded demo load
  if (!loadIdParam) {
    return (
      <PageShell title="Live Auction">
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <Gavel className="h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm font-medium">No auction selected</p>
          <p className="text-xs text-muted-foreground max-w-sm">
            Open an auction from your loads list — each live load has a View Auction action.
          </p>
          <Button variant="outline" asChild>
            <Link to={RoutePath.Loads}>Go to Loads</Link>
          </Button>
        </div>
      </PageShell>
    )
  }

  if (!isValidId || isError) {
    return <NotFound />
  }

  const handleAccept = (bidId: string) => {
    acceptBid({ loadId, bidId })
  }

  // Build sticky bar content from status banners
  const stickyBanners = (
    <div className="flex flex-col gap-2">
      {sseDisconnected && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          <WifiOff className="h-4 w-4 shrink-0" />
          <span>Live feed disconnected for some reason, reconnecting</span>
        </div>
      )}

      {isAuctionOver && isCancelled && (
        <div className="flex items-center gap-2 rounded-md border border-border bg-muted px-4 py-2 text-sm text-muted-foreground">
          <Badge variant="destructive">Cancelled</Badge>
          <span>This auction is cancelled</span>
        </div>
      )}
      {isAuctionOver && !isCancelled && (
        <>
          {winnerBid ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-4 py-3">
              <div className="flex items-center gap-3">
                <Trophy className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <Avatar className="h-9 w-9">
                  <AvatarFallback>
                    {winnerBid.driverId.name
                      .split(' ')
                      .map((p) => p[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-semibold leading-tight">
                    <DriverNameLink
                      name={winnerBid.driverId.name}
                      driverId={winnerBid.driverId._id}
                    />
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Load assigned to a driver at{' '}
                    <span className="font-medium text-emerald-700 dark:text-emerald-400">
                      {formatMoney(winnerBid.amount)}
                    </span>
                  </p>
                </div>
              </div>
              <ReopenAuctionDialog loadId={loadId} />
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-muted px-4 py-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="secondary">Closed</Badge>
                <span>Auction closed with no driver</span>
              </div>
              <ReopenAuctionDialog loadId={loadId} />
            </div>
          )}
        </>
      )}
    </div>
  )

  const subtitle = loadId ? `Load #${loadId.slice(-6).toUpperCase()}` : undefined

  if (isLoading) {
    return (
      <PageShell title="Live Auction" subtitle={subtitle}>
        <Spinner fullPage />
      </PageShell>
    )
  }

  return (
    <PageShell title="Live Auction" subtitle={subtitle} stickyBar={stickyBanners}>
      <div className="flex gap-2">
        <div className="flex-[7] min-w-0">
          <DynamicCard>
            {isLoading || !load || !auction ? (
              <div className="space-y-3">
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : (
              <div className="space-y-6">
                <LoadSummaryCard
                  load={load}
                  auction={auction}
                  companyName={companyName}
                  companyId={companyId}
                />
                <PriceTracker auction={auction} currentPrice={currentPrice} />
                {!isAuctionOver && (
                  <AuctionControls
                    loadId={loadId}
                    auction={auction}
                    bestBid={bestBid}
                    currentPrice={currentPrice}
                    onAcceptBest={() => bestBid && handleAccept(bestBid._id)}
                    accepting={accepting}
                  />
                )}
              </div>
            )}
          </DynamicCard>
        </div>

        <div className="flex-[9] min-w-0">
          <DynamicCard expand>
            {auction ? (
              <BidList
                bids={bids}
                auction={auction}
                onAccept={handleAccept}
                accepting={accepting}
              />
            ) : (
              <div className="space-y-3">
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            )}
          </DynamicCard>
        </div>
      </div>
    </PageShell>
  )
}
