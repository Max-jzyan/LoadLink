import { LOAD_STATUSES } from '@/types/enums'

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  [LOAD_STATUSES.AuctionLive]: {
    label: 'Live Auction',
    cls: 'text-amber-600 bg-amber-50 border-amber-200',
  },
  [LOAD_STATUSES.AuctionClosed]: {
    label: 'Closed',
    cls: 'text-gray-500 bg-gray-50 border-gray-200',
  },
  [LOAD_STATUSES.Booked]: { label: 'Accepted', cls: 'text-green-600 bg-green-50 border-green-200' },
  [LOAD_STATUSES.InTransit]: {
    label: 'In Transit',
    cls: 'text-blue-600 bg-blue-50 border-blue-200',
  },
  [LOAD_STATUSES.Completed]: {
    label: 'Completed',
    cls: 'text-gray-700 bg-gray-100 border-gray-300',
  },
  [LOAD_STATUSES.Cancelled]: { label: 'Cancelled', cls: 'text-red-600 bg-red-50 border-red-200' },
  [LOAD_STATUSES.Draft]: { label: 'Draft', cls: 'text-gray-400 bg-gray-50 border-gray-100' },
}

export function StatusBadge({ status, bidCount }: { status: string; bidCount?: number }) {
  const isNoBids = status === 'auction_live' && bidCount === 0
  const cfg = isNoBids
    ? { label: 'No Bids', cls: 'text-gray-500 bg-gray-50 border-gray-200' }
    : (STATUS_CONFIG[status] ?? { label: status, cls: 'text-gray-400 bg-gray-50 border-gray-100' })

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${cfg.cls}`}
    >
      {cfg.label}
    </span>
  )
}
