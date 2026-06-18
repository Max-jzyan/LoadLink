import { useParams } from 'react-router-dom'
import Col from '@/components/layout/Col'
import DynamicCard from '@/components/layout/DynamicCard'
import LayoutGrid from '@/components/layout/LayoutGrid'
import Row from '@/components/layout/Row'
import { Skeleton } from '@/components/ui/skeleton'
import AuctionControls from '@/components/auction/AuctionControls'
import BidList from '@/components/auction/BidList'
import LoadSummaryCard from '@/components/auction/LoadSummaryCard'
import PriceTracker from '@/components/auction/PriceTracker'
import { useEventSource } from '@/components/auction/useEventSource'
import type { BidsStreamPayload, PriceStreamPayload } from '@/services/auctionApi/auctionEnum'
import { useAcceptBidMutation } from '@/services/auctionApi/auctionSlice'
import { useGetLoadQuery } from '@/services/loadApi/loadSlice'
import NotFound from '@/pages/NotFound'

/**
 * Pass a load id in the URL: http://localhost:3000/auctionLive/<loadId>
 * Visiting /auctionLive with no id falls back to DEMO_LOAD_ID (a seeded live auction).
 *
 * TODO: remove DEMO_LOAD_ID + the bare /auctionLive route after MVP
 */
const DEMO_LOAD_ID = '000000000000000000000102'
const MONGO_ID_RE = /^[a-f\d]{24}$/i

export default function AuctionLive() {
  const { loadId: loadIdParam } = useParams()
  const loadId = loadIdParam ?? DEMO_LOAD_ID

  // If a param was provided but isn't a valid ObjectId, skip the call entirely and render 404
  const isValidId = !loadIdParam || MONGO_ID_RE.test(loadIdParam)

  const { data: load, isLoading, isError } = useGetLoadQuery(loadId, { skip: !isValidId })
  const bidsPayload = useEventSource<BidsStreamPayload>(`/api/auctions/${loadId}/bids`)
  const pricePayload = useEventSource<PriceStreamPayload>(`/api/auctions/${loadId}/price`)
  const [acceptBid, { isLoading: accepting }] = useAcceptBidMutation()
  const auction = load?.auctionId ?? undefined
  const companyName = load?.companyId?.name

  const bids = bidsPayload?.bids ?? []
  const bestBid = bids[0]
  const currentPrice = pricePayload?.currentPrice || auction?.currentPrice || 0

  if (!isValidId || isError) {
    return <NotFound />
  }

  const handleAccept = (bidId: string) => {
    acceptBid({ loadId, bidId })
  }

  return (
    <LayoutGrid>
      <Row size={16}>
        <Col size={7}>
          <DynamicCard>
            {isLoading || !load || !auction ? (
              <div className="space-y-3">
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : (
              <div className="space-y-6">
                <LoadSummaryCard load={load} auction={auction} companyName={companyName} />
                <PriceTracker auction={auction} currentPrice={currentPrice} />
                <AuctionControls
                  loadId={loadId}
                  auction={auction}
                  bestBid={bestBid}
                  currentPrice={currentPrice}
                  onAcceptBest={() => bestBid && handleAccept(bestBid._id)}
                  accepting={accepting}
                />
              </div>
            )}
          </DynamicCard>
        </Col>

        <Col size={9}>
          <DynamicCard>
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
        </Col>
      </Row>
    </LayoutGrid>
  )
}
