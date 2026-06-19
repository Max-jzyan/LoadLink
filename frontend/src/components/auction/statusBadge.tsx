import { Badge } from '@/components/ui/badge'
import { BID_STATUSES } from '@/services/auctionApi/auctionEnum'

type BadgeVariant = React.ComponentProps<typeof Badge>['variant']

interface BadgeConfig {
  variant: BadgeVariant
  label: string
  className?: string
}

const BID_STATUS_BADGE: Record<string, BadgeConfig> = {
  [BID_STATUSES.Accepted]: {
    variant: 'outline',
    label: 'Accepted',
    className: 'border-green-200 bg-green-50 text-green-800',
  },
  [BID_STATUSES.Pending]: {
    variant: 'outline',
    label: 'Pending',
    className: 'border-yellow-200 bg-yellow-50 text-yellow-800',
  },
  [BID_STATUSES.Submitted]: {
    variant: 'outline',
    label: 'Submitted',
    className: 'border-blue-200 bg-blue-50 text-blue-800',
  },
  [BID_STATUSES.Draft]: {
    variant: 'outline',
    label: 'Draft',
    className: 'border-gray-200 bg-gray-50 text-gray-800',
  },
  [BID_STATUSES.Withdrawn]: {
    variant: 'outline',
    label: 'Withdrawn',
    className: 'border-gray-200 bg-gray-50 text-gray-800',
  },
  [BID_STATUSES.Rejected]: {
    variant: 'outline',
    label: 'Rejected',
    className: 'border-red-200 bg-red-50 text-red-800',
  },
  [BID_STATUSES.Expired]: {
    variant: 'outline',
    label: 'Expired',
    className: 'border-red-200 bg-red-50 text-red-800',
  },
}

export function BidStatusBadge({ status }: { status: string }) {
  const cfg = BID_STATUS_BADGE[status] ?? {
    variant: 'outline' as const,
    label: status,
    className: 'border-yellow-200 bg-yellow-50 text-yellow-800',
  }
  return (
    <Badge variant={cfg.variant} className={cfg.className}>
      {cfg.label}
    </Badge>
  )
}
