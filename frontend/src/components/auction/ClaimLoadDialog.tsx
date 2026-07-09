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
import { useClaimLoadMutation } from '@/services/driverApi/driverSlice'

interface ClaimLoadDialogProps {
  loadId: string
  driverId: string | null
  livePrice: number
  originAddress: string
  destinationAddress: string
  isAuctionLive: boolean
}

export default function ClaimLoadDialog({
  loadId,
  driverId,
  livePrice,
  originAddress,
  destinationAddress,
  isAuctionLive,
}: ClaimLoadDialogProps) {
  const [claimLoad, { isLoading, isError, reset }] = useClaimLoadMutation()
  const [open, setOpen] = useState(false)

  const onOpenChange = (next: boolean) => {
    setOpen(next)
    if (next) reset()
  }

  const handleClaim = async () => {
    if (!driverId) return
    const result = await claimLoad({ loadId, body: { driverId } })
    if (!('error' in result)) setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="w-full py-6 text-base font-bold" disabled={!driverId || !isAuctionLive}>
          {isAuctionLive ? `Accept ${formatMoney(livePrice)} Now` : 'Auction Closed'}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Claim this load?</DialogTitle>
          <DialogDescription>
            This will claim the load at the current price and close the auction. This cannot be
            undone.
          </DialogDescription>
        </DialogHeader>

        {/* Load summary card */}
        <div className="flex items-center gap-4 rounded-lg border bg-muted/30 p-4">
          <div className="flex-1 min-w-0">
            <p className="font-semibold leading-tight">
              {originAddress} → {destinationAddress}
            </p>
            <p className="text-xs text-muted-foreground">Final payout</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-2xl font-bold text-primary">{formatMoney(livePrice)}</p>
          </div>
        </div>

        {isError && (
          <p className="text-sm text-destructive">Could not claim the load. Please try again.</p>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={isLoading}>
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={handleClaim} disabled={isLoading}>
            {isLoading ? 'Claiming…' : 'Confirm Claim'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
