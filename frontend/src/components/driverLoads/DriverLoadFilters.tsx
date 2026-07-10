import { useState } from 'react'
import { Search, X, ArrowUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { DatePickerWithRange } from '@/components/shared/DatePickerWithRange'
import type { DateRange } from 'react-day-picker'
import {
  type SortKey,
  type EligibilityFilter,
  SORT_OPTIONS,
  FILTER_OPTIONS,
} from './DriverLoadFilters.types'

interface DriverLoadFiltersProps {
  searchText: string
  onSearchChange: (value: string) => void
  sortKey: SortKey
  onSortChange: (value: SortKey) => void
  eligibilityFilter: EligibilityFilter
  onEligibilityChange: (value: EligibilityFilter) => void
  dateRange?: DateRange
  onDateRangeChange: (range: DateRange | undefined) => void
  counts: { all: number; eligible: number; issues: number; highScore?: number; critical?: number; minor?: number }
  onReset: () => void
}

export function DriverLoadFilters({
  searchText,
  onSearchChange,
  sortKey,
  onSortChange,
  eligibilityFilter,
  onEligibilityChange,
  dateRange,
  onDateRangeChange,
  counts,
  onReset,
}: DriverLoadFiltersProps) {
  const [showSortDropdown, setShowSortDropdown] = useState(false)

  return (
    <div className="flex flex-col gap-2">
      {/* Filter inputs row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Date Range Picker */}
        <DatePickerWithRange
          label="Pickup Date"
          date={dateRange}
          onRangeChange={onDateRangeChange}
        />

        <Separator orientation="vertical" className="hidden md:block h-6" />
        <Separator className="md:hidden w-full" />

        {/* Search input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-8 h-8 text-sm"
            placeholder="Search loads, companies..."
            value={searchText}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {searchText && (
            <button
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => onSearchChange('')}
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <Separator orientation="vertical" className="hidden md:block h-6" />
        <Separator className="md:hidden w-full" />

        {/* Sort dropdown */}
        <div className="relative">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => setShowSortDropdown((v) => !v)}
            title={`Sort: ${SORT_OPTIONS.find((o) => o.value === sortKey)?.label}`}
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
          </Button>
          {showSortDropdown && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowSortDropdown(false)} />
              <div className="absolute right-0 top-full mt-1 z-20 bg-popover border rounded-md shadow-lg min-w-[180px] py-1">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    className={cn(
                      'w-full text-left px-3 py-1.5 text-sm hover:bg-muted transition-colors',
                      sortKey === opt.value && 'font-semibold text-primary'
                    )}
                    onClick={() => {
                      onSortChange(opt.value)
                      setShowSortDropdown(false)
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <Separator orientation="vertical" className="hidden md:block h-6" />
        <Separator className="md:hidden w-full" />

        {/* Eligibility filter buttons */}
        <div className="flex items-center gap-0.5 ml-1">
          {FILTER_OPTIONS.map((opt) => {
            let count = 0
            if (opt.value === 'all') count = counts.all
            else if (opt.value === 'eligible') count = counts.eligible
            else if (opt.value === 'high-score') count = counts.highScore ?? 0
            else if (opt.value === 'issues-critical') count = counts.critical ?? 0
            else if (opt.value === 'issues-minor') count = counts.minor ?? 0

            // Variant styling based on filter type
            let buttonVariant: 'default' | 'outline' | 'destructive' | 'secondary' = 'outline'
            if (eligibilityFilter === opt.value) {
              if (opt.value === 'issues-critical') buttonVariant = 'destructive'
              else if (opt.value === 'high-score') buttonVariant = 'default'
              else buttonVariant = 'default'
            }

            return (
              <Button
                key={opt.value}
                variant={buttonVariant}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => onEligibilityChange(opt.value)}
              >
                {opt.label}
                <span className="ml-1 text-[10px] opacity-70">({count})</span>
              </Button>
            )
          })}
        </div>

        <Separator orientation="vertical" className="hidden md:block h-6" />

        {/* Reset Filters Button */}
        <Button variant="outline" size="sm" onClick={onReset}>
          Reset Filters
        </Button>
      </div>
    </div>
  )
}