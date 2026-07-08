import type { ColumnDef } from '@tanstack/react-table'
import type { Load, AuctionSummary } from '@/services/loadApi/loadEnum'
import type { Truck } from '@/services/driverApi/driverEnum'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { LoadActionsCell } from './LoadActionsCell'
import { ResponsiveRowMenu } from '@/components/shared/ResponsiveRowMenu'
import { type LoadStatus } from '@/types/enums'
import { TRUCK_TYPES } from '@/types/enums'
import { Badge } from '@/components/ui/badge'
import { Truck as TruckIcon } from 'lucide-react'

const TRUCK_LABELS: Record<string, string> = Object.fromEntries(
  TRUCK_TYPES.map((t) => [t.value, t.label])
)

function truckDisplayName(t: Truck) {
  return `${t.year} ${t.make} ${t.model} (${t.trailerLengthFt}ft)`
}

export const columns = (trucks: Truck[] = []): ColumnDef<Load>[] => [
  {
    accessorKey: 'commodity',
    header: 'Commodity',
    cell: ({ row }) => {
      const commodity = row.getValue<string>('commodity')
      return <p className="font-semibold text-sm">{commodity.toUpperCase()}</p>
    },
  },
  {
    id: 'origin',
    header: 'Origin',
    accessorFn: (row) => row.originAddress,
    cell: ({ row }) => {
      const { originAddress } = row.original
      return (
        <span
          className="text-sm text-muted-foreground block max-w-[200px] truncate"
          title={originAddress}
        >
          {originAddress}
        </span>
      )
    },
    maxSize: 200,
    meta: {
      headerClassName: 'hidden md:table-cell',
      cellClassName: 'hidden md:table-cell max-w-[200px]',
    },
  },
  {
    id: 'destination',
    header: 'Destination',
    accessorFn: (row) => row.destinationAddress,
    cell: ({ row }) => {
      const { destinationAddress } = row.original
      return (
        <span
          className="text-sm text-muted-foreground block max-w-[200px] truncate"
          title={destinationAddress}
        >
          {destinationAddress}
        </span>
      )
    },
    maxSize: 200,
    meta: {
      headerClassName: 'hidden lg:table-cell',
      cellClassName: 'hidden lg:table-cell max-w-[200px]',
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
      headerClassName: 'hidden xl:table-cell',
      cellClassName: 'hidden xl:table-cell',
    },
  },
  {
    accessorKey: 'weightLbs',
    header: 'Weight (lbs)',
    cell: ({ row }) => {
      const weight = row.getValue<number>('weightLbs')
      return weight.toLocaleString()
    },
    meta: {
      headerClassName: 'hidden xl:table-cell',
      cellClassName: 'hidden xl:table-cell',
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
    meta: {
      headerClassName: 'hidden 2xl:table-cell',
      cellClassName: 'hidden 2xl:table-cell',
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
    meta: {
      headerClassName: 'hidden 2xl:table-cell',
      cellClassName: 'hidden 2xl:table-cell',
    },
  },
  {
    id: 'currentPrice',
    header: 'My Price',
    accessorFn: (row) => {
      const auction = row.auctionId
      return auction && typeof auction === 'object'
        ? (auction as AuctionSummary).currentPrice
        : null
    },
    sortingFn: (a, b) => {
      const av = a.getValue<number | null>('currentPrice') ?? -1
      const bv = b.getValue<number | null>('currentPrice') ?? -1
      return av - bv
    },
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
    meta: {
      headerClassName: 'hidden md:table-cell',
      cellClassName: 'hidden md:table-cell',
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
    id: 'truck',
    header: 'My Truck',
    accessorFn: (row) => {
      const truck = trucks.find((t) => t._id === row.selectedTruckId)
      return truck ? truckDisplayName(truck) : ''
    },
    cell: ({ row }) => {
      const load = row.original
      const truck = trucks.find((t) => t._id === load.selectedTruckId)
      if (!truck) {
        return (
          <Badge
            variant="outline"
            className="border-amber-300 text-amber-600 gap-1"
            title="No truck selected for this load"
          >
            <TruckIcon className="h-3 w-3" />
            No Truck
          </Badge>
        )
      }
      return (
        <span className="text-sm block max-w-[200px] truncate" title={truckDisplayName(truck)}>
          {truckDisplayName(truck)}
        </span>
      )
    },
    maxSize: 200,
    meta: {
      headerClassName: 'hidden lg:table-cell',
      cellClassName: 'hidden lg:table-cell max-w-[200px]',
    },
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => (
      <div className="w-[140px] min-w-[140px]">
        <LoadActionsCell load={row.original} trucks={trucks} />
      </div>
    ),
    size: 140,
    meta: {
      headerClassName: 'hidden 2xl:table-cell',
      cellClassName: 'hidden 2xl:table-cell',
    },
  },
  {
    id: 'mobileActions',
    header: '',
    cell: ({ row }) => {
      const load = row.original
      const selTruck = trucks.find((t) => t._id === load.selectedTruckId)
      return (
        <div className="2xl:hidden">
          <ResponsiveRowMenu
            load={load}
            mobileDetails={[
              {
                label: 'Truck Type',
                value: (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary text-secondary-foreground border border-border">
                    {TRUCK_LABELS[load.truckType] ?? load.truckType}
                  </span>
                ),
              },
              {
                label: 'Assigned Truck',
                value: selTruck ? (
                  <span className="text-sm">{truckDisplayName(selTruck)}</span>
                ) : (
                  <span className="text-sm text-amber-600">No Truck Selected</span>
                ),
              },
              {
                label: 'Weight',
                value: <span>{load.weightLbs.toLocaleString()} lbs</span>,
              },
              {
                label: 'Pickup',
                value: (
                  <span className="text-right">
                    {new Date(load.pickupTime).toLocaleDateString()}
                    <br />
                    <span className="text-muted-foreground">
                      {new Date(load.pickupTime).toLocaleTimeString()}
                    </span>
                  </span>
                ),
              },
              {
                label: 'Dropoff',
                value: (
                  <span className="text-right">
                    {new Date(load.dropoffTime).toLocaleDateString()}
                    <br />
                    <span className="text-muted-foreground">
                      {new Date(load.dropoffTime).toLocaleTimeString()}
                    </span>
                  </span>
                ),
              },
              {
                label: 'My Price',
                value: (() => {
                  const auction = load.auctionId
                  const currentPrice =
                    auction && typeof auction === 'object'
                      ? (auction as AuctionSummary).currentPrice
                      : null
                  return (
                    <span className="font-semibold">
                      {currentPrice != null ? `$${currentPrice.toLocaleString()}` : '—'}
                    </span>
                  )
                })(),
              },
            ]}
          >
            <LoadActionsCell load={load} trucks={trucks} />
          </ResponsiveRowMenu>
        </div>
      )
    },
    meta: {
      headerClassName: '2xl:hidden',
      cellClassName: '2xl:hidden',
    },
  },
]
