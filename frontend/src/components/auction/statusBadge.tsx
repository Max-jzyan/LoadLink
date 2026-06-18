import { Badge } from '@/components/ui/badge'
import { BID_STATUSES } from '@/services/auctionApi/auctionEnum'

type BadgeVariant = React.ComponentProps<typeof Badge>['variant']

const BID_STATUS_BADGE: Record<string, { variant: BadgeVariant; label: string }> = {
  [BID_STATUSES.Accepted]: { variant: 'default', label: 'Accepted' },
  [BID_STATUSES.Pending]: { variant: 'secondary', label: 'Pending' },
  [BID_STATUSES.Submitted]: { variant: 'secondary', label: 'Submitted' },
  [BID_STATUSES.Draft]: { variant: 'outline', label: 'Draft' },
  [BID_STATUSES.Withdrawn]: { variant: 'outline', label: 'Withdrawn' },
  [BID_STATUSES.Rejected]: { variant: 'destructive', label: 'Rejected' },
  [BID_STATUSES.Expired]: { variant: 'destructive', label: 'Expired' },
}

export function BidStatusBadge({ status }: { status: string }) {
  const cfg = BID_STATUS_BADGE[status] ?? { variant: 'outline' as const, label: status }
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>
}
