import type { ColumnDef } from '@tanstack/react-table'
import type { Load } from '@/services/loadApi/loadEnum'

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
  },
]
