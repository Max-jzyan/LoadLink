import type { ColumnDef } from '@tanstack/react-table'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import type { LoadWithDetails } from '@/services/companyApi/companyTypes'
import { RoutePath } from '@/config/routes'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ResponsiveRowMenu } from '@/components/shared/ResponsiveRowMenu'
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
    header: 'Load / Commodity',
    cell: ({ row }) => {
      const { commodity } = row.original
      return <p className="font-semibold text-sm">{commodity.toUpperCase()}</p>
    },
  },
  {
    id: 'route',
    header: 'Route',
    cell: ({ row }) => {
      const { originAddress, destinationAddress } = row.original
      return (
        <span className="text-sm text-muted-foreground">
          {originAddress}
          <span className="mx-1.5 opacity-40">→</span>
          {destinationAddress}
        </span>
      )
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
      headerClassName: 'hidden lg:table-cell',
      cellClassName: 'hidden lg:table-cell',
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
      headerClassName: 'hidden lg:table-cell',
      cellClassName: 'hidden lg:table-cell',
    },
  },
  {
    id: 'currentPrice',
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
      headerClassName: 'hidden lg:table-cell',
      cellClassName: 'hidden lg:table-cell',
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
              <Link to={`/loads/${load._id}`}>View</Link>
            </Button>
          )}
          {canEdit && (
            <Button size="sm" variant="ghost" asChild>
              <Link to={`/loads/${load._id}/edit`}>Edit</Link>
            </Button>
          )}
        </div>
      )
    },
    meta: {
      headerClassName: 'hidden lg:table-cell',
      cellClassName: 'hidden lg:table-cell',
    },
  },
  {
    id: 'mobileActions',
    header: '',
    cell: ({ row }) => {
      const load = row.original
      const canEdit = !(NON_EDITABLE_STATUSES as readonly string[]).includes(load.status)
      return (
        <div className="lg:hidden">
          <ResponsiveRowMenu
            load={load}
            mobileDetails={[
              {
                label: 'Truck',
                value: (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary text-secondary-foreground border border-border">
                    {TRUCK_LABELS[load.truckType] ?? load.truckType}
                  </span>
                ),
              },
              {
                label: 'Bids',
                value: (
                  <span
                    className={
                      load.bidCount > 0 ? 'text-primary font-semibold' : 'text-muted-foreground'
                    }
                  >
                    {load.bidCount}
                  </span>
                ),
              },
              {
                label: 'Current Price',
                value: (
                  <span className="font-semibold">
                    {load.auctionId ? `$${load.auctionId.currentPrice.toLocaleString()}` : '—'}
                  </span>
                ),
              },
            ]}
          >
            {load.status === LOAD_STATUSES.InTransit ? (
              <DropdownMenuItem asChild>
                <Link to={RoutePath.Map}>Track</Link>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem asChild>
                <Link to={`/loads/${load._id}`}>View</Link>
              </DropdownMenuItem>
            )}
            {canEdit && (
              <DropdownMenuItem asChild>
                <Link to={`/loads/${load._id}/edit`}>Edit</Link>
              </DropdownMenuItem>
            )}
          </ResponsiveRowMenu>
        </div>
      )
    },
    meta: {
      headerClassName: 'lg:hidden',
      cellClassName: 'lg:hidden',
    },
  },
]
