import { useCallback, useState, useMemo } from 'react'
import type { Table } from '@tanstack/react-table'
import { Link } from 'react-router-dom'
import { DataTable, type OnTableReadyPayload, type DrawerField } from '@/components/shared/DataTable'
import DynamicCard from '@/components/layout/DynamicCard'
import LoadTablePagination from '@/components/driverLoads/loadTablePagination'
import type { LoadWithDetails } from '@/services/companyApi/companyTypes'
import { companyColumns } from './companyColumns'
import { TRUCK_TYPES, LOAD_STATUSES, type LoadStatus } from '@/types/enums'
import { Button } from '@/components/ui/button'
import { RoutePath } from '@/config/routes'
import { StatusBadge } from '@/components/shared/StatusBadge'

const TRUCK_LABELS: Record<string, string> = Object.fromEntries(
  TRUCK_TYPES.map((t) => [t.value, t.label])
)

const NON_EDITABLE_STATUSES = [
  LOAD_STATUSES.InTransit,
  LOAD_STATUSES.Booked,
  LOAD_STATUSES.Completed,
  LOAD_STATUSES.Cancelled,
] as const

interface CompanyLoadTableProps {
  title?: string
  loads: LoadWithDetails[]
  onRowClick?: (load: LoadWithDetails) => void
  selectedId?: string | null
}

export default function CompanyLoadTable({
  title,
  loads,
  onRowClick,
  selectedId,
}: CompanyLoadTableProps) {
  const [table, setTable] = useState<Table<LoadWithDetails> | null>(null)
  const [pageIndex, setPageIndex] = useState(0)

  const handleTableReady = (payload: OnTableReadyPayload<LoadWithDetails>) => {
    setTable(payload.table)
    setPageIndex(payload.pageIndex)
  }

  const drawerTitle = useCallback((load: LoadWithDetails) => load.commodity.toUpperCase(), [])

  const drawerFields = useMemo<DrawerField<LoadWithDetails>[]>(() => [
    // Route section
    {
      label: 'Origin',
      renderValue: (load) => <span className="text-sm">{load.originAddress}</span>,
    },
    {
      label: 'Destination',
      renderValue: (load) => <span className="text-sm">{load.destinationAddress}</span>,
    },
    // Schedule section
    {
      label: 'Pickup',
      renderValue: (load) => (
        <span>
          <span className="text-sm">{new Date(load.pickupTime).toLocaleDateString()}</span>
          <br />
          <span className="text-xs text-muted-foreground">
            {new Date(load.pickupTime).toLocaleTimeString()}
          </span>
        </span>
      ),
    },
    {
      label: 'Dropoff',
      renderValue: (load) => (
        <span>
          <span className="text-sm">{new Date(load.dropoffTime).toLocaleDateString()}</span>
          <br />
          <span className="text-xs text-muted-foreground">
            {new Date(load.dropoffTime).toLocaleTimeString()}
          </span>
        </span>
      ),
    },
    // Cargo section
    {
      label: 'Weight',
      renderValue: (load) => <span>{load.weightLbs.toLocaleString()} lbs</span>,
    },
    {
      label: 'Truck Type',
      renderValue: (load) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary text-secondary-foreground border border-border">
          {TRUCK_LABELS[load.truckType] ?? load.truckType}
        </span>
      ),
    },
    {
      label: 'Trailer Length',
      renderValue: (load) => <span>{load.trailerLengthFt} ft</span>,
    },
    // Pricing section
    {
      label: 'Bids',
      renderValue: (load) => (
        <span
          className={`text-sm font-semibold ${load.bidCount > 0 ? 'text-primary' : 'text-muted-foreground'}`}
        >
          {load.bidCount}
        </span>
      ),
    },
    {
      label: 'Current Price',
      renderValue: (load) => (
        <span className="font-semibold">
          {load.auctionId ? `$${load.auctionId.currentPrice.toLocaleString()}` : '—'}
        </span>
      ),
    },
    {
      label: 'Status',
      renderValue: (load) => (
        <StatusBadge status={load.status as LoadStatus} bidCount={load.bidCount} />
      ),
    },
  ], [])

  const drawerFooter = useCallback((load: LoadWithDetails) => {
    const canEdit = !(NON_EDITABLE_STATUSES as readonly string[]).includes(load.status)
    return (
      <div className="flex w-full flex-col gap-2">
        {load.status === LOAD_STATUSES.InTransit ? (
          <Button className="w-full" size="sm" asChild>
            <Link to={RoutePath.Map}>Track</Link>
          </Button>
        ) : (
          <Button className="w-full" size="sm" asChild>
            <Link to={`/loads/${load._id}`}>View</Link>
          </Button>
        )}
        {canEdit && (
          <Button className="w-full" size="sm" variant="ghost" asChild>
            <Link to={`/loads/${load._id}/edit`}>Edit</Link>
          </Button>
        )}
      </div>
    )
  }, [])

  return (
    <DynamicCard
      title={title}
      footer={table && <LoadTablePagination table={table} currentPage={pageIndex} />}
    >
      <DataTable
        columns={companyColumns}
        data={loads}
        onTableReady={handleTableReady}
        onRowClick={onRowClick}
        selectedId={selectedId}
        getId={(load) => load._id}
        drawerTitle={drawerTitle}
        drawerFields={drawerFields}
        drawerFooter={drawerFooter}
      />
    </DynamicCard>
  )
}