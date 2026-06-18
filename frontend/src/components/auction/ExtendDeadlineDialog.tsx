import { useState } from 'react'
import { Clock } from 'lucide-react'
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
import { useEditAuctionMutation } from '@/services/auctionApi/auctionSlice'

interface ExtendDeadlineDialogProps {
  loadId: string
  disabled?: boolean
}

export default function ExtendDeadlineDialog({ loadId, disabled }: ExtendDeadlineDialogProps) {
  const [editAuction, { isLoading, isError, reset }] = useEditAuctionMutation()
  const [open, setOpen] = useState(false)
  const [minutes, setMinutes] = useState('60')

  const onOpenChange = (next: boolean) => {
    setOpen(next)
    if (next) {
      reset()
      setMinutes('60')
    }
  }

  const handleExtend = async () => {
    const value = Number(minutes)
    if (!Number.isFinite(value) || value <= 0) return
    const result = await editAuction({ loadId, body: { extendByMinutes: value } })
    if (!('error' in result)) setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={disabled}>
          <Clock className="h-4 w-4" /> Extend Deadline
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Extend Deadline</DialogTitle>
          <DialogDescription>Add time before the auction closes.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="extend-minutes">Extend by (minutes)</Label>
          <Input
            id="extend-minutes"
            type="number"
            min={1}
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
          />
        </div>
        {isError && (
          <p className="text-sm text-destructive">
            Could not extend the deadline. Please try again.
          </p>
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleExtend} disabled={isLoading}>
            {isLoading ? 'Saving…' : 'Extend'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
