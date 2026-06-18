import { useState } from 'react'
import { Ban } from 'lucide-react'
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
import { useCancelAuctionMutation } from '@/services/auctionApi/auctionSlice'

interface CancelAuctionDialogProps {
  loadId: string
  disabled?: boolean
}

export default function CancelAuctionDialog({ loadId, disabled }: CancelAuctionDialogProps) {
  const [cancelAuction, { isLoading, isError, reset }] = useCancelAuctionMutation()
  const [open, setOpen] = useState(false)

  const onOpenChange = (next: boolean) => {
    setOpen(next)
    if (next) reset()
  }

  const handleCancel = async () => {
    const result = await cancelAuction(loadId)
    if (!('error' in result)) setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="destructive" className="w-full" disabled={disabled}>
          <Ban className="h-4 w-4" /> Cancel Auction &amp; Remove Load
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel this auction?</DialogTitle>
          <DialogDescription>
            This cancels the auction and removes the load. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        {isError && (
          <p className="text-sm text-destructive">
            Could not cancel the auction. Please try again.
          </p>
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Keep Auction</Button>
          </DialogClose>
          <Button variant="destructive" onClick={handleCancel} disabled={isLoading}>
            {isLoading ? 'Cancelling…' : 'Cancel Auction'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
