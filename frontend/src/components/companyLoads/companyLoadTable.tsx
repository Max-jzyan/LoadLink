import { useState } from 'react'
import type { Table } from '@tanstack/react-table'
import { DataTable, type OnTableReadyPayload } from '@/components/shared/DataTable'
import DynamicCard from '@/components/layout/DynamicCard'
import LoadTablePagination from '@/components/driverLoads/loadTablePagination'
import type { LoadWithDetails } from '@/services/companyApi/companyTypes'
import { companyColumns } from './companyColumns'

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
      />
    </DynamicCard>
  )
}
