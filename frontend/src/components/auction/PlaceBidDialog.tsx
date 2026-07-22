import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { formatMoney } from '@/lib/format'
import { usePlaceBidMutation } from '@/services/driverApi/driverSlice'
import ScheduleConflictWarning from '@/components/auction/ScheduleConflictWarning'

interface PlaceBidDialogProps {
  loadId: string
  driverId: string | null
  bidAmount: number
  currentPrice?: number
  isAuctionLive: boolean
  onPlaced: () => void
}

export default function PlaceBidDialog({
  loadId,
  driverId,
  bidAmount,
  currentPrice,
  isAuctionLive,
  onPlaced,
}: PlaceBidDialogProps) {
  const [placeBid, { isLoading, isError, reset }] = usePlaceBidMutation()
  const [open, setOpen] = useState(false)

  const isValidAmount = bidAmount > 0 && (currentPrice === undefined || bidAmount >= currentPrice)

  const onOpenChange = (next: boolean) => {
    setOpen(next)
    if (next) reset()
  }

  const handlePlaceBid = async () => {
    if (!driverId) return
    const result = await placeBid({ loadId, body: { driverId, amount: bidAmount } })
    if (!('error' in result)) {
      setOpen(false)
      onPlaced()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="default"
          size="lg"
          disabled={!driverId || !isAuctionLive || !isValidAmount}
        >
          Place Bid
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Place this bid?</DialogTitle>
          <DialogDescription>Bids cannot be withdrawn once submitted.</DialogDescription>
        </DialogHeader>

        {/* Bid summary card */}
        <div className="flex items-center gap-4 rounded-lg border bg-muted/30 p-4">
          <div className="flex-1 min-w-0">
            <p className="font-semibold leading-tight">Your bid</p>
            {typeof currentPrice === 'number' && (
              <p className="text-xs text-muted-foreground">
                Current accept price {formatMoney(currentPrice)}
              </p>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="text-2xl font-bold text-primary">{formatMoney(bidAmount)}</p>
          </div>
        </div>

        <ScheduleConflictWarning
          driverId={driverId}
          loadId={loadId}
          isAuctionLive={isAuctionLive}
          isOpen={open}
        />

        {isError && (
          <p className="text-sm text-destructive">Could not place your bid. Please try again.</p>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={isLoading}>
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={handlePlaceBid} disabled={isLoading}>
            {isLoading ? 'Placing…' : 'Confirm Bid'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
