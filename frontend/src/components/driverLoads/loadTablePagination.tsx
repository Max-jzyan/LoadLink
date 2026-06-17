import { useMemo } from 'react'
import type { Table } from '@tanstack/react-table'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'

// This whole page can and should be re-evaluated for styling.  This is just boiler plate "it works" implementation.
function buildPageNumbers(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i)
  }

  if (current < 3) {
    return [0, 1, 2, 3, 'ellipsis', total - 2, total - 1]
  }

  if (current > total - 4) {
    return [0, 1, 'ellipsis', total - 3, total - 2, total - 1]
  }

  return [0, 'ellipsis', current - 1, current, current + 1, 'ellipsis', total - 1]
}

interface LoadTablePaginationProps<TData> {
  table: Table<TData>
  currentPage: number
}

export default function LoadTablePagination<TData>({
  table,
  currentPage,
}: LoadTablePaginationProps<TData>) {
  const totalPages = table.getPageCount()

  const pageNumbers = useMemo(
    () => buildPageNumbers(currentPage, totalPages),
    [currentPage, totalPages]
  )

  if (totalPages <= 1) {
    return null
  }

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            onClick={(e) => {
              e.preventDefault()
              table.previousPage()
            }}
            className={
              !table.getCanPreviousPage() ? 'pointer-events-none opacity-50' : 'cursor-pointer'
            }
          />
        </PaginationItem>

        {pageNumbers.map((page, idx) =>
          page === 'ellipsis' ? (
            <PaginationItem key={`ellipsis-${idx}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={page}>
              <PaginationLink
                isActive={page === currentPage}
                onClick={(e) => {
                  e.preventDefault()
                  table.setPageIndex(page)
                }}
                className="cursor-pointer"
              >
                {page + 1}
              </PaginationLink>
            </PaginationItem>
          )
        )}

        <PaginationItem>
          <PaginationNext
            onClick={(e) => {
              e.preventDefault()
              table.nextPage()
            }}
            className={
              !table.getCanNextPage() ? 'pointer-events-none opacity-50' : 'cursor-pointer'
            }
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}
