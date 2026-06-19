import Col from '@/components/layout/Col'
import DynamicCard from '@/components/layout/DynamicCard'
import Row from '@/components/layout/Row'
import { PriceInput } from '@/components/shared/PriceInput'
import { Badge } from '@/components/ui/badge'
import { AUCTION_STATUSES } from '@/services/auctionApi/auctionEnum'
import { PriceInputVariant } from '@/types/enums'
import { BadgeAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { useSelector } from 'react-redux'
import { usePlaceBidMutation } from '@/services/driverApi/driverSlice'
import { selectMongoId } from '@/services/authSlice'

interface BidInputProps {
  loadId: string
  auctionStatus?: string
}

export default function BidInput({ loadId, auctionStatus }: BidInputProps) {
  const [bidAmount, setBidAmount] = useState<number | ''>('')
  const [placeBid, { isLoading: isPlacing }] = usePlaceBidMutation()
  const mongoId = useSelector(selectMongoId)
  const isAuctionLive = auctionStatus === AUCTION_STATUSES.Active

  const handleBidChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setBidAmount(value === '' ? '' : Number(value))
  }

  const handlePlaceBid = async () => {
    if (typeof bidAmount !== 'number' || bidAmount <= 0) return
    if (!mongoId) {
      alert('You must be logged in to place a bid.')
      return
    }
    try {
      await placeBid({ loadId, body: { driverId: mongoId, amount: bidAmount } }).unwrap()
      setBidAmount('')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to place bid'
      alert(message)
    }
  }

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
      <Row size={1}>
        <Col size={1}>
          <PriceInput
            variant={PriceInputVariant.AMOUNT}
            placeholder="0.00"
            value={bidAmount}
            onChange={handleBidChange}
            fullWidth
            disabled={!isAuctionLive}
          />
        </Col>
        <div className="flex-shrink-0 flex items-center">
          <Button
            variant="default"
            size="lg"
            onClick={handlePlaceBid}
            disabled={isPlacing || !isAuctionLive}
          >
            {isPlacing ? 'Placing…' : 'Place Bid'}
          </Button>
        </div>
      </Row>
    </DynamicCard>
  )
}
