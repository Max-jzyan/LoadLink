import { AlertTriangle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import DriverNameLink from '@/components/shared/DriverNameLink'
import { formatMoney } from '@/lib/format'
import type { PopulatedBid } from '@/services/auctionApi/auctionEnum'

// AI Generated
interface AcceptBidDialogProps {
  /** The bid to confirm, or null when the dialog is closed. */
  bid: PopulatedBid | null
  /** True when this bid is the lowest (best) offer on the auction. */
  isBest: boolean
  /** Whether the auction is still live (gate for accepting). */
  isLive: boolean
  /** Whether the accept mutation is in-flight. */
  accepting: boolean
  /** Called when the user confirms acceptance. */
  onAccept: () => void
  /** Called when the user dismisses the dialog. */
  onClose: () => void
}

const initials = (name: string) =>
  name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

export default function AcceptBidDialog({
  bid,
  isBest,
  isLive,
  accepting,
  onAccept,
  onClose,
}: AcceptBidDialogProps) {
  if (!bid) return null

  const driver = bid.driverId
  const rating = driver.ratingSummary?.average
  const isWithdrawn = bid.status === 'withdrawn'

  const submittedAt = (() => {
    try {
      return formatDistanceToNow(new Date(bid.createdAt), { addSuffix: true })
    } catch {
      return ''
    }
  })()

  return (
    <Dialog open={!!bid} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Accept this bid?</DialogTitle>
          <DialogDescription>
            This will close the auction and book the load with the selected driver.
          </DialogDescription>
        </DialogHeader>

        {/* Bid summary card */}
        <div className="flex items-center gap-4 rounded-lg border bg-muted/30 p-4">
          <Avatar className="h-12 w-12 text-base">
            <AvatarFallback>{initials(driver.name ?? '?')}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-semibold leading-tight">
              <DriverNameLink name={driver.name} driverId={driver._id} />
            </p>
            <p className="text-xs text-muted-foreground">
              {typeof rating === 'number' ? `${rating.toFixed(1)} ★` : 'No rating yet'}
              {submittedAt ? ` · Submitted ${submittedAt}` : ''}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p
              className={`text-2xl font-bold ${isWithdrawn ? 'text-red-700 line-through' : 'text-primary'}`}
            >
              {formatMoney(bid.amount)}
            </p>
            {isBest && !isWithdrawn && (
              <Badge variant="default" className="mt-1 text-xs">
                Best offer
              </Badge>
            )}
          </div>
        </div>

        {/* Withdrawn warning */}
        {isWithdrawn && (
          <div className="flex items-start gap-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2.5 text-sm text-red-700 dark:text-red-400">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              This bid has been <strong>withdrawn</strong> by the driver due to a scheduling
              conflict and cannot be accepted.
            </span>
          </div>
        )}

        {/* Cheaper-offer warning — only shown when this isn't the lowest bid */}
        {!isBest && !isWithdrawn && (
          <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-700 dark:text-amber-400">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              There is a <strong>cheaper offer</strong> available. You can accept the best bid from
              the main controls without opening a specific row.
            </span>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={accepting}>
            Cancel
          </Button>
          <Button onClick={onAccept} disabled={!isLive || accepting || isWithdrawn}>
            {accepting
              ? 'Accepting…'
              : isWithdrawn
                ? 'Bid withdrawn'
                : `Accept — ${formatMoney(bid.amount)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
