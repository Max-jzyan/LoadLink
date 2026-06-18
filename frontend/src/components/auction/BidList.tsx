import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatMoney } from '@/lib/format'
import {
  AUCTION_STATUSES,
  type Auction,
  type PopulatedBid,
} from '@/services/auctionApi/auctionEnum'
import BidRow from './BidRow'
import AutoAcceptInfo from './AutoAcceptInfo'

interface BidListProps {
  bids: PopulatedBid[]
  auction: Auction
  onAccept: (bidId: string) => void
  accepting?: boolean
}

export default function BidList({ bids, auction, onAccept, accepting }: BidListProps) {
  const best = bids[0]
  const isLive = auction.status === AUCTION_STATUSES.Active
  const ceiling = auction.capPrice * (1 + auction.autoAcceptPercent / 100)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Live Bids</h2>
        <Badge variant="secondary">{bids.length} bids</Badge>
      </div>

      {best && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/40 bg-primary/5 p-3">
          <div>
            <p className="text-xs text-muted-foreground">Best Bid Right Now</p>
            <p className="text-lg font-bold text-primary">
              {formatMoney(best.amount)} by {best.driverId.name}
            </p>
          </div>
          <Button onClick={() => onAccept(best._id)} disabled={!isLive || accepting}>
            {accepting ? 'Accepting…' : 'Accept'}
          </Button>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-sm font-medium">All Bids ({bids.length})</p>
        {bids.length === 0 && <p className="text-sm text-muted-foreground">No bids yet.</p>}
        {bids.map((bid) => (
          <BidRow
            key={bid._id}
            bid={bid}
            isBest={bid._id === best?._id}
            withinAutoAccept={bid.amount <= ceiling}
          />
        ))}
      </div>

      <AutoAcceptInfo auction={auction} />
    </div>
  )
}
