import type { ColumnDef } from '@tanstack/react-table'
import type { Load } from '@/services/loadApi/loadEnum'
import { Badge } from '@/components/ui/badge'

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100',
  auction_live: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  auction_closed: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100',
  booked: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  in_transit: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
}

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  auction_live: 'Auction Live',
  auction_closed: 'Auction Closed',
  booked: 'Booked',
  in_transit: 'In Transit',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export const columns: ColumnDef<Load>[] = [
  {
    accessorKey: '_id',
    header: 'Load ID',
    cell: ({ row }) => {
      const id = row.getValue<string>('_id')
      return id.slice(-6)
    },
  },
  {
    accessorKey: 'originAddress',
    header: 'Origin',
  },
  {
    accessorKey: 'destinationAddress',
    header: 'Destination',
  },
  {
    accessorKey: 'commodity',
    header: 'Commodity',
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
      return new Date(date).toLocaleDateString()
    },
  },
  {
    accessorKey: 'dropoffTime',
    header: 'Dropoff',
    cell: ({ row }) => {
      const date = row.getValue<string>('dropoffTime')
      return new Date(date).toLocaleDateString()
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue<string>('status')
      return (
        <Badge className={statusColors[status] ?? 'bg-gray-100 text-gray-800'}>
          {statusLabels[status] ?? status}
        </Badge>
      )
    },
  },
]
