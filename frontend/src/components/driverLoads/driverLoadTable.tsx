import { DataTable, type OnTableReadyPayload } from '@/components/shared/DataTable'
import type { Load } from '@/services/loadApi/loadEnum'
import type { Truck } from '@/services/driverApi/driverEnum'
import type { Table } from '@tanstack/react-table'
import { useState } from 'react'
import { columns } from './driverColumns'
import LoadTablePagination from './loadTablePagination'
import DynamicCard from '../layout/DynamicCard'

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
      />
    </DynamicCard>
  )
}
