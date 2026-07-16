'use client'

/* eslint-disable react-compiler/react-compiler */

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  type ColumnDef,
  type SortingState,
  type Table as TanstackTable,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronRight, Inbox } from 'lucide-react'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import DrawerShell from '@/components/layout/DrawerShell'
import { Field, FieldLabel } from '@/components/ui/field'

import { cn } from '@/lib/utils'

// ──────────────────────────────────────────────
// Responsive breakpoint type for column meta
// ──────────────────────────────────────────────
export type ResponsiveBreakpoint = 'always' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'

const RESPONSIVE_CLASSES: Record<ResponsiveBreakpoint, string> = {
  always: '',
  sm: 'hidden sm:table-cell',
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
  xl: 'hidden xl:table-cell',
  '2xl': 'hidden 2xl:table-cell',
}

type DataTableColumnMeta = {
  responsive?: ResponsiveBreakpoint
  headerClassName?: string
  cellClassName?: string
  [key: string]: unknown
}

// ──────────────────────────────────────────────
// Drawer detail field type
// ──────────────────────────────────────────────
export interface DrawerField<TData> {
  label: string
  renderValue: (row: TData) => React.ReactNode
}

// ──────────────────────────────────────────────
// Existing exported types
// ──────────────────────────────────────────────
export interface OnTableReadyPayload<TData> {
  table: TanstackTable<TData>
  pageIndex: number
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  onTableReady?: (payload: OnTableReadyPayload<TData>) => void
  onRowClick?: (row: TData) => void
  selectedId?: string | null
  getId?: (row: TData) => string
  /** Enable detail drawer + trigger column. Default: true */
  enableDrawer?: boolean
  // Detail drawer props
  drawerTitle?: (row: TData) => string
  drawerFields?: DrawerField<TData>[]
  /** Standard form submit for drawer footer (Close + Save) */
  drawerSubmit?: (row: TData) => void
  /** If true, drawer footer shows a single Close button (no Save) */
  drawerIsViewOnly?: boolean
  /** Full custom footer for drawer (takes precedence over drawerSubmit).
   * Can be a static node or a function receiving the selected row and helpers. */
  drawerFooter?:
    | React.ReactNode
    | ((row: TData, helpers: { onClose: () => void }) => React.ReactNode)
}

// ──────────────────────────────────────────────
// SortIcon sub-component
// ──────────────────────────────────────────────
function SortIcon({
  column,
}: {
  column: {
    getIsSorted: () => false | 'asc' | 'desc'
    getCanSort: () => boolean
    toggleSorting: () => void
  }
}) {
  const sorted = column.getIsSorted()
  if (sorted === 'asc') return <ArrowUp className="ml-1 inline-block h-3.5 w-3.5" />
  if (sorted === 'desc') return <ArrowDown className="ml-1 inline-block h-3.5 w-3.5" />
  if (!column.getCanSort()) return null
  return (
    <ArrowUpDown className="ml-1 inline-block h-3.5 w-3.5 opacity-30 transition-opacity group-hover:opacity-100" />
  )
}

// ──────────────────────────────────────────────
// Drawer trigger column (chevron button) - sticky right
// ──────────────────────────────────────────────
const TRIGGER_CELL_CLASS = 'sticky right-0 bg-background w-[48px] min-w-[48px] max-w-[48px]'

function createDrawerTriggerColumn<TData, TValue>(
  onOpen: (row: TData) => void
): ColumnDef<TData, TValue> {
  return {
    id: '__drawer_trigger__',
    header: '',
    size: 48,
    minSize: 48,
    maxSize: 48,
    cell: ({ row }) => (
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
        onClick={(e) => {
          e.stopPropagation()
          onOpen(row.original)
        }}
        aria-label="Open details"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    ),
    meta: { responsive: 'always' } satisfies DataTableColumnMeta,
  }
}

// ──────────────────────────────────────────────
// Main DataTable component
// ──────────────────────────────────────────────
export function DataTable<TData, TValue>({
  columns,
  data,
  onTableReady,
  onRowClick,
  selectedId,
  getId,
  enableDrawer = true,
  drawerTitle,
  drawerFields,
  drawerSubmit,
  drawerIsViewOnly,
  drawerFooter,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedDrawerRow, setSelectedDrawerRow] = useState<TData | null>(null)

  const handleDrawerOpen = useCallback((row: TData) => {
    setSelectedDrawerRow(row)
    setDrawerOpen(true)
  }, [])

  const drawerEnabled = enableDrawer && drawerFields
  const isViewOnly = !!drawerIsViewOnly

  // Keep selectedDrawerRow in sync when data updates (e.g. after optimistic Redux updates)
  useEffect(() => {
    if (!drawerOpen || !selectedDrawerRow || !getId) return
    const currentId = getId(selectedDrawerRow)
    if (!currentId) return
    const updated = data.find((item) => getId(item) === currentId)
    if (updated && updated !== selectedDrawerRow) {
      setSelectedDrawerRow(updated)
    }
  }, [data, drawerOpen, selectedDrawerRow, getId])

  // Append drawer trigger column if drawer is enabled
  const allColumns = useMemo<ColumnDef<TData, TValue>[]>(() => {
    if (!drawerEnabled) return columns
    return [...columns, createDrawerTriggerColumn<TData, TValue>(handleDrawerOpen)]
  }, [drawerEnabled, columns, handleDrawerOpen])

  const table = useReactTable({
    data,
    columns: allColumns,
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

  // When drawerFooter is a function but selectedDrawerRow is falsy (e.g., during initial render),
  // typeof drawerFooter === 'function' would pass the function unchecked to the else branch.
  // Explicitly handle all branches to avoid returning a function as a ReactNode.
  const footerNode: React.ReactNode =
    typeof drawerFooter === 'function' && selectedDrawerRow
      ? drawerFooter(selectedDrawerRow, {
          onClose: () => {
            setDrawerOpen(false)
            setSelectedDrawerRow(null)
          },
        })
      : typeof drawerFooter === 'function'
        ? undefined
        : drawerFooter
  const submitObj =
    drawerSubmit && selectedDrawerRow && !footerNode
      ? {
          onSubmit: async () => {
            if (isViewOnly) {
              setDrawerOpen(false)
            } else {
              await drawerSubmit(selectedDrawerRow)
              setDrawerOpen(false)
            }
          },
          submitLabel: isViewOnly ? 'Close' : 'Save Changes',
          cancelLabel: isViewOnly ? '' : undefined,
        }
      : undefined

  return (
    <>
      <div className="min-w-0 overflow-hidden rounded-md border shadow-sm">
        <Table className="max-w-full">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const meta = header.column.columnDef.meta as DataTableColumnMeta | undefined
                  const canSort = header.column.getCanSort()
                  const responsiveClass = meta?.responsive
                    ? RESPONSIVE_CLASSES[meta.responsive]
                    : ''
                  const isTrigger = header.column.id === '__drawer_trigger__'
                  return (
                    <TableHead
                      key={header.id}
                      className={cn(
                        'bg-muted/30 font-semibold',
                        canSort && 'cursor-pointer select-none group',
                        responsiveClass,
                        isTrigger && TRIGGER_CELL_CLASS,
                        (meta?.headerClassName as string | undefined) ?? ''
                      )}
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                    >
                      {header.isPlaceholder ? null : (
                        <span className="inline-flex items-center gap-1">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {canSort && (
                            <SortIcon
                              column={
                                header.column as unknown as {
                                  getIsSorted: () => false | 'asc' | 'desc'
                                  getCanSort: () => boolean
                                  toggleSorting: () => void
                                }
                              }
                            />
                          )}
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
              table.getRowModel().rows.map((row) => {
                const rowId =
                  getId?.(row.original) ??
                  ((row.original as Record<string, unknown>)._id as string | undefined)
                const isSelected = selectedId != null && rowId != null && rowId === selectedId
                return (
                  <TableRow
                    key={row.id}
                    data-state={isSelected ? 'selected' : undefined}
                    className={cn(
                      onRowClick && 'cursor-pointer',
                      isSelected && 'bg-muted/50 hover:bg-muted/50'
                    )}
                    onClick={() => onRowClick?.(row.original)}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const meta = cell.column.columnDef.meta as DataTableColumnMeta | undefined
                      const responsiveClass = meta?.responsive
                        ? RESPONSIVE_CLASSES[meta.responsive]
                        : ''
                      const isTrigger = cell.column.id === '__drawer_trigger__'
                      return (
                        <TableCell
                          key={cell.id}
                          className={cn(
                            responsiveClass,
                            isTrigger && TRIGGER_CELL_CLASS,
                            (meta?.cellClassName as string | undefined) ?? ''
                          )}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      )
                    })}
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={allColumns.length} className="py-12 text-center">
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

      {/* Detail Drawer */}
      {drawerEnabled && selectedDrawerRow && (
        <DrawerShell
          open={drawerOpen}
          onOpenChange={(open) => {
            setDrawerOpen(open)
            if (!open) setSelectedDrawerRow(null)
          }}
          title={drawerTitle?.(selectedDrawerRow) ?? 'Details'}
          size="md"
          footer={footerNode ?? undefined}
          drawerSubmit={submitObj}
        >
          <div className="space-y-4">
            {drawerFields!.map((field, idx) => (
              <Field key={idx} orientation="horizontal" className="items-start flex-wrap">
                <FieldLabel className="min-w-[120px] text-xs font-medium text-muted-foreground shrink-0">
                  {field.label}
                </FieldLabel>
                <div className="text-sm min-w-0 break-words">
                  {field.renderValue(selectedDrawerRow)}
                </div>
              </Field>
            ))}
          </div>
        </DrawerShell>
      )}
    </>
  )
}
