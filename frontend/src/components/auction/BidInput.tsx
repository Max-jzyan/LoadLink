import Col from '@/components/layout/Col'
import DynamicCard from '@/components/layout/DynamicCard'
import Row from '@/components/layout/Row'
import { PriceInput } from '@/components/shared/PriceInput'
import { Badge } from '@/components/ui/badge'
import { AUCTION_STATUSES } from '@/services/auctionApi/auctionEnum'
import { PriceInputVariant } from '@/types/enums'
import { BadgeAlert } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { selectMongoId } from '@/services/authSlice'
import PlaceBidDialog from '@/components/auction/PlaceBidDialog'

interface BidInputProps {
  loadId: string
  auctionStatus?: string
  currentPrice?: number
  onPriceChange?: (price: number) => void
  onBidActiveChange?: (active: boolean) => void
}

export default function BidInput({
  loadId,
  auctionStatus,
  currentPrice,
  onPriceChange,
  onBidActiveChange,
}: BidInputProps) {
  const [bidAmount, setBidAmount] = useState<number | ''>('')
  const mongoId = useSelector(selectMongoId)
  const isAuctionLive = auctionStatus === AUCTION_STATUSES.Active

  const handleBidChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    const next = value === '' ? '' : Number(value)
    setBidAmount(next)
    if (typeof next === 'number') {
      onPriceChange?.(next)
      onBidActiveChange?.(true)
    } else if (value === '' && typeof currentPrice === 'number') {
      onPriceChange?.(currentPrice)
      onBidActiveChange?.(false)
    }
  }

  useEffect(() => {
    if (bidAmount === '' && typeof currentPrice === 'number') {
      onPriceChange?.(currentPrice)
      onBidActiveChange?.(false)
    }
  }, [bidAmount, currentPrice, onPriceChange, onBidActiveChange])

  const isBelowCurrentPrice =
    typeof bidAmount === 'number' && currentPrice !== undefined && bidAmount < currentPrice

  return (
    <DynamicCard
      title="Your Bid Amount"
      size="sm"
      noFooterStyle
      titleClassName="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
      footer={
        isAuctionLive ? (
          <Badge
            variant="outline"
            className="border-yellow-200 bg-yellow-50 text-yellow-800 hover:bg-yellow-100"
            data-icon="inline-start"
          >
            <BadgeAlert data-icon="inline-start" />
            Bids cannot be withdrawn after submission
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="border-red-200 bg-red-50 text-red-800 hover:bg-red-100"
            data-icon="inline-start"
          >
            <BadgeAlert data-icon="inline-start" />
            The auction is no longer taking any bids.
          </Badge>
        )
      }
    >
      <Row size={1} className="gap-2">
        <Col size={1}>
          <PriceInput
            variant={PriceInputVariant.AMOUNT}
            placeholder="0.00"
            value={bidAmount}
            onChange={handleBidChange}
            fullWidth
            disabled={!isAuctionLive}
          />
          {isBelowCurrentPrice && (
            <p className="text-xs text-destructive mt-1">
              Bid must be at least the current accept price.
            </p>
          )}
        </Col>
        <div className="flex-shrink-0 flex items-center">
          <PlaceBidDialog
            loadId={loadId}
            driverId={mongoId}
            bidAmount={typeof bidAmount === 'number' ? bidAmount : 0}
            currentPrice={currentPrice}
            isAuctionLive={isAuctionLive}
            onPlaced={() => setBidAmount('')}
          />
        </div>
      </Row>
    </DynamicCard>
  )
}
