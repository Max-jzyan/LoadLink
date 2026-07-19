import type { ColumnDef } from '@tanstack/react-table'
import type { Load, AuctionSummary } from '@/services/loadApi/loadEnum'
import type { Truck } from '@/services/driverApi/driverEnum'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { LoadManageDialog, truckDisplayName } from './LoadManageDialog'
import { type LoadStatus } from '@/types/enums'
import { TRUCK_TYPES } from '@/types/enums'
import CompanyNameLink from '@/components/shared/CompanyNameLink'

const TRUCK_LABELS: Record<string, string> = Object.fromEntries(
  TRUCK_TYPES.map((t) => [t.value, t.label])
)

export const columns = (trucks: Truck[] = []): ColumnDef<Load>[] => [
  {
    id: 'company',
    header: 'Company',
    accessorFn: (row) => {
      const company = row.companyId
      return typeof company === 'object' && company !== null ? company.companyName : null
    },
    cell: ({ row }) => {
      const company = row.original.companyId
      const companyId = typeof company === 'object' ? company._id : company
      const companyName = typeof company === 'object' ? (company.companyName ?? company.name) : null
      return companyId ? (
        <CompanyNameLink
          name={companyName || undefined}
          companyId={companyId}
          className="font-semibold text-sm"
        />
      ) : (
        <span className="text-sm text-muted-foreground">Unassigned</span>
      )
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
      responsive: 'md',
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
      responsive: 'md',
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
      responsive: 'sm',
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
      responsive: 'sm',
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
    accessorKey: 'weightLbs',
    header: 'Weight (lbs)',
    cell: ({ row }) => {
      const weight = row.getValue<number>('weightLbs')
      return weight.toLocaleString()
    },
    meta: {
      responsive: 'xl',
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
      responsive: 'lg',
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
    id: 'manage',
    header: 'Manage',
    accessorFn: (row) => {
      const truck = trucks.find((t) => t._id === row.selectedTruckId)
      return truck ? truckDisplayName(truck) : ''
    },
    cell: ({ row }) => <LoadManageDialog load={row.original} trucks={trucks} />,
    size: 110,
    // Always visible — this is the driver's sole action surface for a load,
    // so it can't be responsively hidden the way informational columns can.
    meta: {
      responsive: 'always',
    },
  },
]
