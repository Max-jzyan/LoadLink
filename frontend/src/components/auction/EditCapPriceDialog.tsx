import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatMoney } from '@/lib/format'
import { PriceInput } from '@/components/shared/PriceInput'
import { PriceInputVariant } from '@/types/enums'
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

interface EditCapPriceDialogProps {
  loadId: string
  currentCap?: number
  currentPrice?: number
  disabled?: boolean
}

export default function EditCapPriceDialog({
  loadId,
  currentCap,
  currentPrice,
  disabled,
}: EditCapPriceDialogProps) {
  const [editAuction, { isLoading, isError, reset }] = useEditAuctionMutation()
  const [open, setOpen] = useState(false)
  const [newCap, setNewCap] = useState('')

  const onOpenChange = (next: boolean) => {
    setOpen(next)
    if (next) {
      reset()
      setNewCap(currentCap != null ? String(currentCap) : '')
    }
  }

  const floor = currentPrice ?? 0
  const parsed = newCap.trim() === '' ? NaN : Number(newCap)
  const isNumber = Number.isFinite(parsed)
  const belowFloor = isNumber && parsed < floor
  const unchanged = isNumber && parsed === currentCap
  const invalid = !isNumber || parsed <= 0 || belowFloor || unchanged

  const handleEditCap = async () => {
    if (invalid) return
    const result = await editAuction({ loadId, body: { newPriceCeiling: parsed } })
    if (!('error' in result)) setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={disabled}>
          <Pencil className="h-4 w-4" /> Edit Cap Price
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Cap Price</DialogTitle>
          <DialogDescription>
            Current cap: {typeof currentCap === 'number' ? formatMoney(currentCap) : '—'}
          </DialogDescription>
        </DialogHeader>

        <PriceInput
          label="New cap price"
          variant={PriceInputVariant.AMOUNT}
          min={floor || 1}
          value={newCap}
          onChange={(e) => setNewCap(e.target.value)}
        />
        {belowFloor ? (
          <p className="text-sm text-destructive">
            Cap can’t be below the current price ({formatMoney(floor)}).
          </p>
        ) : (
          floor > 0 && (
            <p className="text-sm text-muted-foreground">
              Must be at least {formatMoney(floor)} (current price).
            </p>
          )
        )}
        {isError && (
          <p className="text-sm text-destructive">
            Could not update the cap price. Please try again.
          </p>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleEditCap} disabled={isLoading || invalid}>
            {isLoading ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
