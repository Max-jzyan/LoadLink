'use client'

/* eslint-disable react-compiler/react-compiler */

import { useEffect, useState } from 'react'
import {
  type ColumnDef,
  type SortingState,
  type Table as TanstackTable,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  getPaginationRowModel,
} from '@tanstack/react-table'
import { ArrowUpDown, ArrowUp, ArrowDown, Inbox } from 'lucide-react'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { cn } from '@/lib/utils'

export interface OnTableReadyPayload<TData> {
  table: TanstackTable<TData>
  pageIndex: number
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  onTableReady?: (payload: OnTableReadyPayload<TData>) => void
  onRowClick?: (row: TData) => void
}

export function DataTable<TData, TValue>({
  columns,
  data,
  onTableReady,
  onRowClick,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([])

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: { sorting },
    onSortingChange: setSorting,
  })

  const pageIndex = table.getState().pagination.pageIndex

  useEffect(() => {
    if (onTableReady) {
      onTableReady({ table, pageIndex })
    }
  }, [onTableReady, table, pageIndex])

  const SortIcon = ({ column }: { column: { getIsSorted: () => false | 'asc' | 'desc'; toggleSorting: () => void } }) => {
    const sorted = column.getIsSorted()
    if (sorted === 'asc') return <ArrowUp className="ml-1 inline-block h-3.5 w-3.5" />
    if (sorted === 'desc') return <ArrowDown className="ml-1 inline-block h-3.5 w-3.5" />
    return <ArrowUpDown className="ml-1 inline-block h-3.5 w-3.5 opacity-30 group-hover:opacity-100 transition-opacity" />
  }

  // Requires creating a column object as seen in `frontend\src\components\driverLoads\driverColumns.tsx`
  return (
    <div className="overflow-hidden rounded-md border shadow-sm">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const meta = header.column.columnDef.meta as Record<string, unknown> | undefined
                const canSort = header.column.getCanSort()
                return (
                  <TableHead
                    key={header.id}
                    className={cn(
                      'bg-muted/30 font-semibold',
                      canSort && 'cursor-pointer select-none group',
                      (meta?.headerClassName as string | undefined) ?? ''
                    )}
                    onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                  >
                    {header.isPlaceholder ? null : (
                      <span className="inline-flex items-center">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {canSort && <SortIcon column={header.column} />}
                      </span>
                    )}
                  </TableHead>
                )
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && 'selected'}
                className={cn(onRowClick && 'cursor-pointer')}
                onClick={() => onRowClick?.(row.original)}
              >
                {row.getVisibleCells().map((cell) => {
                  const meta = cell.column.columnDef.meta as Record<string, unknown> | undefined
                  return (
                    <TableCell
                      key={cell.id}
                      className={(meta?.cellClassName as string | undefined) ?? ''}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  )
                })}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="py-12 text-center">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Inbox className="h-8 w-8" />
                  <p>No results.</p>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}