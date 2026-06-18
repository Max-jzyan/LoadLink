import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { useReopenAuctionMutation } from '@/services/auctionApi/auctionSlice'

interface ReopenAuctionDialogProps {
  loadId: string
  disabled?: boolean
}

export default function ReopenAuctionDialog({ loadId, disabled }: ReopenAuctionDialogProps) {
  const [reopenAuction, { isLoading, isError, reset }] = useReopenAuctionMutation()
  const [open, setOpen] = useState(false)
  const [hours, setHours] = useState('4')

  const onOpenChange = (next: boolean) => {
    setOpen(next)
    if (next) {
      reset()
      setHours('4')
    }
  }

  const parsed = Number(hours)
  const invalid = !Number.isFinite(parsed) || parsed <= 0

  const handleReopen = async () => {
    if (invalid) return
    const result = await reopenAuction({ loadId, body: { extendByHours: parsed } })
    if (!('error' in result)) setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={disabled}>
          <RotateCcw className="h-4 w-4" /> Reopen Auction
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reopen this auction?</DialogTitle>
          <DialogDescription>
            The auction will go live again. Any previously accepted bids will return to submitted
            status and the current drtiver assignment will be cleared
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="reopen-hours">New deadline (hours from now)</Label>
          <Input
            id="reopen-hours"
            type="number"
            min={1}
            step={1}
            value={hours}
            onChange={(e) => setHours(e.target.value)}
          />
        </div>

        {isError && (
          <p className="text-sm text-destructive">
            Could not reopen the auction. Please try again.
          </p>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={isLoading}>
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={handleReopen} disabled={isLoading || invalid}>
            {isLoading ? 'Reopening…' : `Reopen for ${parsed > 0 ? parsed : '-'}h`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
