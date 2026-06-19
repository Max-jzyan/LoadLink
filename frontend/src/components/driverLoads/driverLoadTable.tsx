import { DataTable, type OnTableReadyPayload } from '@/components/shared/DataTable'
import type { Load } from '@/services/loadApi/loadEnum'
import type { Table } from '@tanstack/react-table'
import { useState } from 'react'
import { columns } from './driverColumns'
import LoadTablePagination from './loadTablePagination'
import DynamicCard from '../layout/DynamicCard'

interface DriverLoadTableProps {
  title: string
  loads: Load[]
  onRowClick?: (load: Load) => void
}

export default function DriverLoadTable({ loads, onRowClick }: DriverLoadTableProps) {
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
        columns={columns}
        data={loads}
        onTableReady={handleTableReady}
        onRowClick={onRowClick}
      />
    </DynamicCard>
  )
}
