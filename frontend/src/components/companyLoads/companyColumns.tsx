import type { ColumnDef } from '@tanstack/react-table'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import type { LoadWithDetails } from '@/services/companyApi/companyTypes'
import { RoutePath } from '@/config/routes'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { TRUCK_TYPES, LOAD_STATUSES, type LoadStatus } from '@/types/enums'

const TRUCK_LABELS: Record<string, string> = Object.fromEntries(
  TRUCK_TYPES.map((t) => [t.value, t.label])
)

const NON_EDITABLE_STATUSES = [
  LOAD_STATUSES.InTransit,
  LOAD_STATUSES.Booked,
  LOAD_STATUSES.Completed,
  LOAD_STATUSES.Cancelled,
] as const

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
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => {
      const load = row.original
      const canEdit = !(NON_EDITABLE_STATUSES as readonly string[]).includes(load.status)
      return (
        <div className="flex items-center gap-2">
          {load.status === LOAD_STATUSES.InTransit ? (
            // track links to map page -- per-load tracking page not yet implemented
            <Button size="sm" asChild>
              <Link to={RoutePath.Map}>Track</Link>
            </Button>
          ) : (
            // view links to load detail page -- not yet implemented
            <Button size="sm" asChild>
              <Link to={`/loads/${load._id}`} state={{ from: RoutePath.CompanyDashboard }}>
                View
              </Link>
            </Button>
          )}
          {canEdit && (
            <Button size="sm" variant="ghost" asChild>
              <Link to={`/loads/${load._id}/edit`} state={{ from: RoutePath.CompanyDashboard }}>
                Edit
              </Link>
            </Button>
          )}
        </div>
      )
    },
    meta: {
      responsive: '2xl',
    },
  },
]
