import { useState } from 'react'
import { Search, X, ArrowUpDown, Sparkles } from 'lucide-react'
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
  counts: {
    all: number
    eligible: number
    issues: number
    highScore?: number
    critical?: number
    minor?: number
  }
  onReset: () => void
  /** Called when the user clicks the AI insight sparkles button */
  onAiClick?: () => void
  /** True while the AI insight panel is visible (highlights the button) */
  aiActive?: boolean
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
  onAiClick,
  aiActive,
}: DriverLoadFiltersProps) {
  const [showSortDropdown, setShowSortDropdown] = useState(false)

  return (
    <div className="flex flex-col gap-2">
      {/* Row 1: date picker + search + sort */}
      <div className="flex flex-wrap items-center gap-2">
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
      </div>

      {/* Row 2: eligibility filter buttons + AI button (far right) */}
      <div className="flex items-center gap-1.5">
        <div className="flex items-center gap-0.5">
          {FILTER_OPTIONS.map((opt) => {
            const count = { all: counts.all, eligible: counts.eligible, issues: counts.issues }[
              opt.value
            ]
            return (
              <Button
                key={opt.value}
                variant={eligibilityFilter === opt.value ? 'default' : 'outline'}
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

        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={onReset}
          title="Reset all filters"
        >
          Reset
        </Button>

        {/* AI insight trigger — far right; only renders when caller provides onAiClick */}
        {onAiClick && (
          <Button
            variant={aiActive ? 'default' : 'outline'}
            size="icon"
            className={cn(
              'h-8 w-8 shrink-0 ml-auto',
              aiActive && 'bg-violet-600 hover:bg-violet-700 border-violet-600'
            )}
            onClick={onAiClick}
            title="Generate AI load insight"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </div>
  )
}
