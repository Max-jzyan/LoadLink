import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatMoney } from '@/lib/format'
import {
  AUCTION_STATUSES,
  type Auction,
  type PopulatedBid,
} from '@/services/auctionApi/auctionEnum'
import CancelAuctionDialog from './CancelAuctionDialog'
import EditCapPriceDialog from './EditCapPriceDialog'
import ExtendDeadlineDialog from './ExtendDeadlineDialog'

interface AuctionControlsProps {
  loadId: string
  auction?: Auction
  bestBid?: PopulatedBid
  currentPrice?: number
  onAcceptBest: () => void
  accepting?: boolean
}

export default function AuctionControls({
  loadId,
  auction,
  bestBid,
  currentPrice,
  onAcceptBest,
  accepting,
}: AuctionControlsProps) {
  const isLive = auction?.status === AUCTION_STATUSES.Active

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">Auction Controls</h3>

      <Button className="w-full" onClick={onAcceptBest} disabled={!isLive || !bestBid || accepting}>
        <CheckCircle2 className="h-4 w-4" />
        {bestBid
          ? `Accept Best Bid Now (${formatMoney(bestBid.amount)} — ${bestBid.driverId.name})`
          : 'No bids to accept'}
      </Button>

      <div className="grid grid-cols-2 gap-2">
        <ExtendDeadlineDialog loadId={loadId} disabled={!isLive} />
        <EditCapPriceDialog
          loadId={loadId}
          currentCap={auction?.capPrice}
          currentPrice={currentPrice}
          disabled={!isLive}
        />
      </div>

      <CancelAuctionDialog loadId={loadId} disabled={!isLive} />
    </div>
  )
}
