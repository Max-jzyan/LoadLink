import { Info } from 'lucide-react'
import { formatMoney } from '@/lib/format'
import type { Auction } from '@/services/auctionApi/auctionEnum'

export default function AutoAcceptInfo({ auction }: { auction: Auction }) {
  const ceiling = auction.capPrice * (1 + auction.autoAcceptPercent / 100)

  return (
    <div className="flex gap-2 rounded-lg border bg-muted/40 p-3 text-sm">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <div>
        <p className="font-medium text-primary">Auto-Accept Rule Active</p>
        <p className="text-muted-foreground">
          {auction.autoAcceptTriggerHours > 0
            ? `Starting ${auction.autoAcceptTriggerHours}h before the deadline (or when the timer ends, whichever comes first)`
            : 'If this load is unbooked when the timer ends'}
          , the system automatically accepts the lowest bid at or below {formatMoney(ceiling)} (the
          cap {formatMoney(auction.capPrice)} + {auction.autoAcceptPercent}% tolerance).
        </p>
      </div>
    </div>
  )
}
