import type { ColumnDef } from '@tanstack/react-table'
import type { Load, AuctionSummary } from '@/services/loadApi/loadEnum'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { LoadActionsCell } from './LoadActionsCell'
import { type LoadStatus } from '@/types/enums'
import { TRUCK_TYPES } from '@/types/enums'

const TRUCK_LABELS: Record<string, string> = Object.fromEntries(
  TRUCK_TYPES.map((t) => [t.value, t.label])
)

export const columns: ColumnDef<Load>[] = [
  {
    accessorKey: 'commodity',
    header: 'Commodity',
    cell: ({ row }) => {
      const commodity = row.getValue<string>('commodity')
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
  },
  {
    accessorKey: 'weightLbs',
    header: 'Weight (lbs)',
    cell: ({ row }) => {
      const weight = row.getValue<number>('weightLbs')
      return weight.toLocaleString()
    },
  },
  {
    accessorKey: 'pickupTime',
    header: 'Pickup',
    cell: ({ row }) => {
      const date = row.getValue<string>('pickupTime')
      const d = new Date(date)
      return (
        <span>
          <span className="text-sm">{d.toLocaleDateString()}</span>
          <br />
          <span className="text-xs text-muted-foreground">{d.toLocaleTimeString()}</span>
        </span>
      )
    },
  },
  {
    accessorKey: 'dropoffTime',
    header: 'Dropoff',
    cell: ({ row }) => {
      const date = row.getValue<string>('dropoffTime')
      const d = new Date(date)
      return (
        <span>
          <span className="text-sm">{d.toLocaleDateString()}</span>
          <br />
          <span className="text-xs text-muted-foreground">{d.toLocaleTimeString()}</span>
        </span>
      )
    },
  },
  {
    id: 'currentPrice',
    header: 'My Price',
    cell: ({ row }) => {
      const auction = row.original.auctionId
      const currentPrice =
        auction && typeof auction === 'object' ? (auction as AuctionSummary).currentPrice : null
      return (
        <span className="text-sm font-semibold">
          {currentPrice != null ? `$${currentPrice.toLocaleString()}` : '—'}
        </span>
      )
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue<string>('status')
      return <StatusBadge status={status as LoadStatus} />
    },
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => (
      <div className="w-[140px] min-w-[140px]">
        <LoadActionsCell load={row.original} />
      </div>
    ),
    size: 140,
  },
]
