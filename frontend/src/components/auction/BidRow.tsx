import { formatDistanceToNow } from 'date-fns'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import DriverNameLink from '@/components/shared/DriverNameLink'
import { formatMoney } from '@/lib/format'
import type { PopulatedBid } from '@/services/auctionApi/auctionEnum'
import { BidStatusBadge } from './statusBadge'

interface BidRowProps {
  bid: PopulatedBid
  isBest?: boolean
  withinAutoAccept?: boolean
  onClick?: () => void
}

const initials = (name: string) =>
  name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

const timeAgo = (iso: string) => {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true })
  } catch {
    return ''
  }
}

export default function BidRow({ bid, isBest, withinAutoAccept, onClick }: BidRowProps) {
  const driver = bid.driverId
  const rating = driver.ratingSummary?.average

  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors ${
        onClick ? 'cursor-pointer hover:bg-muted/50' : ''
      }`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
    >
      <div className="flex items-center gap-3">
        <Avatar>
          <AvatarFallback>{initials(driver.name ?? '?')}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium">
            <DriverNameLink name={driver.name} driverId={driver._id} />
          </p>
          <p className="text-xs text-muted-foreground">
            Driver{typeof rating === 'number' ? ` · ${rating.toFixed(1)} ★` : ''}
          </p>
        </div>
      </div>

      <div className="flex flex-col items-end gap-1">
        <span className="text-lg font-semibold">{formatMoney(bid.amount)}</span>
        <div className="flex items-center gap-1">
          {isBest && <Badge variant="default">Best</Badge>}
          {withinAutoAccept && <Badge variant="secondary">Within auto-accept</Badge>}
          <BidStatusBadge status={bid.status} />
        </div>
        <span className="text-xs text-muted-foreground">{timeAgo(bid.createdAt)}</span>
      </div>
    </div>
  )
}
