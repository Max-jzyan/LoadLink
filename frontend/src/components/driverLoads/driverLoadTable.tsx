import CompanyNameLink from '@/components/shared/CompanyNameLink'
import {
  DataTable,
  type DrawerField,
  type OnTableReadyPayload,
} from '@/components/shared/DataTable'
import DocumentLinks from '@/components/shared/DocumentLinks'
import type { Truck } from '@/services/driverApi/driverEnum'
import type { AuctionSummary, CompanySummary, Load } from '@/services/loadApi/loadEnum'
import { TRUCK_TYPES } from '@/types/enums'
import type { Table } from '@tanstack/react-table'
import { useMemo, useState } from 'react'
import DynamicCard from '../layout/DynamicCard'
import { columns } from './driverColumns'
import LoadTablePagination from './loadTablePagination'

const TRUCK_LABELS: Record<string, string> = Object.fromEntries(
  TRUCK_TYPES.map((t) => [t.value, t.label])
)

function isPopulatedCompany(value: Load['companyId']): value is CompanySummary {
  return typeof value === 'object' && value !== null && 'companyName' in value
}

function getCurrentPrice(load: Load): number | null {
  const auction = load.auctionId
  return auction && typeof auction === 'object' ? (auction as AuctionSummary).currentPrice : null
}

interface DriverLoadTableProps {
  title: string
  loads: Load[]
  trucks?: Truck[]
  onRowClick?: (load: Load) => void
  selectedId?: string | null
}

export default function DriverLoadTable({
  loads,
  trucks = [],
  onRowClick,
  selectedId,
}: DriverLoadTableProps) {
  const [table, setTable] = useState<Table<Load> | null>(null)
  const [pageIndex, setPageIndex] = useState(0)

  const handleTableReady = (payload: OnTableReadyPayload<Load>) => {
    setTable(payload.table)
    setPageIndex(payload.pageIndex)
  }

  const drawerTitle = (load: Load) => {
    const company = isPopulatedCompany(load.companyId) ? load.companyId : null
    if (company) {
      return (
        <CompanyNameLink
          name={company.companyName?.toUpperCase() ?? ''}
          companyId={company._id}
          className="font-semibold"
        />
      )
    }
    return load.commodity.toUpperCase()
  }

  // Read-only, company-posted load info. Anything the driver can *act* on
  // (truck assignment, status transitions, notifying the company) lives in
  // the "Manage" dialog on the row instead — see LoadManageDialog.
  const drawerFields = useMemo<DrawerField<Load>[]>(
    () => [
      {
        label: 'Commodity',
        renderValue: (load) => (
          <span className="text-sm font-semibold">{load.commodity.toUpperCase()}</span>
        ),
      },
      {
        label: 'Origin',
        renderValue: (load) => <span className="text-sm">{load.originAddress}</span>,
      },
      {
        label: 'Destination',
        renderValue: (load) => <span className="text-sm">{load.destinationAddress}</span>,
      },
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
      {
        label: 'Current Price',
        renderValue: (load) => {
          const price = getCurrentPrice(load)
          return (
            <span className="font-semibold">
              {price != null ? `$${price.toLocaleString()}` : '—'}
            </span>
          )
        },
      },
    ],
    []
  )

  const documentDrawerFields = useMemo<DrawerField<Load>[]>(
    () => [
      {
        label: 'Documents',
        renderValue: (load) => <DocumentLinks loadId={load._id} />,
      },
    ],
    []
  )

  return (
    <DynamicCard
      title="Loads"
      footer={table && <LoadTablePagination table={table} currentPage={pageIndex} />}
    >
      <DataTable
        columns={columns(trucks)}
        data={loads}
        onTableReady={handleTableReady}
        onRowClick={onRowClick}
        selectedId={selectedId}
        getId={(load) => load._id}
        drawerTitle={drawerTitle}
        drawerFields={[...drawerFields, ...documentDrawerFields]}
      />
    </DynamicCard>
  )
}
