import type { ColumnDef } from '@tanstack/react-table'
import type { LoadWithDetails } from '@/services/companyApi/companyTypes'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { CompanyManageDialog } from './CompanyManageDialog'
import { TRUCK_TYPES, type LoadStatus } from '@/types/enums'

const TRUCK_LABELS: Record<string, string> = Object.fromEntries(
  TRUCK_TYPES.map((t) => [t.value, t.label])
)

export const companyColumns: ColumnDef<LoadWithDetails>[] = [
  {
    id: 'load',
    accessorKey: 'commodity',
    header: 'Load / Commodity',
    cell: ({ row }) => {
      const { commodity } = row.original
      return <p className="font-semibold text-sm">{commodity.toUpperCase()}</p>
    },
  },
  {
    id: 'origin',
    accessorKey: 'originAddress',
    header: 'Origin',
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground" title={row.original.originAddress}>
        {row.original.originAddress.split(',')[0].trim()}
      </span>
    ),
    meta: {
      responsive: 'md',
    },
  },
  {
    id: 'destination',
    accessorKey: 'destinationAddress',
    header: 'Destination',
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground" title={row.original.destinationAddress}>
        {row.original.destinationAddress.split(',')[0].trim()}
      </span>
    ),
    meta: {
      responsive: 'lg',
    },
  },
  {
    accessorKey: 'truckType',
    header: 'Truck',
    cell: ({ row }) => (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary text-secondary-foreground border border-border">
        {TRUCK_LABELS[row.getValue<string>('truckType')] ?? row.getValue<string>('truckType')}
      </span>
    ),
    meta: {
      responsive: 'xl',
    },
  },
  {
    accessorKey: 'bidCount',
    header: 'Bids',
    cell: ({ row }) => {
      const count = row.getValue<number>('bidCount')
      return (
        <span
          className={`text-sm font-semibold ${count > 0 ? 'text-primary' : 'text-muted-foreground'}`}
        >
          {count}
        </span>
      )
    },
    meta: {
      responsive: 'xl',
    },
  },
  {
    id: 'currentPrice',
    accessorFn: (row) => row.auctionId?.currentPrice ?? 0,
    header: 'Current Price',
    cell: ({ row }) => {
      const auction = row.original.auctionId
      return (
        <span className="text-sm font-semibold">
          {auction ? `$${auction.currentPrice.toLocaleString()}` : '—'}
        </span>
      )
    },
    meta: {
      responsive: 'xl',
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <StatusBadge status={row.original.status as LoadStatus} bidCount={row.original.bidCount} />
    ),
  },
  {
    id: 'manage',
    header: 'Manage',
    cell: ({ row }) => <CompanyManageDialog load={row.original} />,
    size: 110,
    // Always visible — this is the company's sole action surface for a load,
    // so it can't be responsively hidden the way informational columns can.
    meta: {
      responsive: 'always',
    },
  },
]
