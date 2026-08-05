import { DatePickerWithRange } from '@/components/shared/DatePickerWithRange'
import ResponsiveFilterBar from '@/components/shared/ResponsiveFilterBar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { ArrowUpDown, Search, Sparkles, X } from 'lucide-react'
import { useState } from 'react'
import type { DateRange } from 'react-day-picker'
import type { EligibilityFilter, SortKey } from './DriverLoadFilters.types'
import { FILTER_OPTIONS, SORT_OPTIONS } from './DriverLoadFilters.types'

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

  const controls = [
    {
      id: 'dateRange',
      label: 'Pickup Date',
      content: (
        <DatePickerWithRange
          label="Pickup Date"
          date={dateRange}
          onRangeChange={onDateRangeChange}
        />
      ),
    },
    {
      id: 'search',
      label: 'Search',
      content: (
        <div className="relative w-64">
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
      ),
    },
    {
      id: 'sort',
      label: 'Sort',
      alwaysVisible: true,
      content: (
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
      ),
    },
    {
      id: 'eligibility',
      label: 'Eligibility',
      content: (
        <div className="flex flex-wrap items-center gap-0.5">
          {FILTER_OPTIONS.map((opt) => {
            const count = {
              all: counts.all,
              eligible: counts.eligible,
              'high-score': counts.highScore,
              'issues-critical': counts.critical,
              'issues-minor': counts.minor,
            }[opt.value]
            return (
              <Button
                key={opt.value}
                variant={eligibilityFilter === opt.value ? 'default' : 'outline'}
                size="sm"
                className="h-7 px-2 text-xs flex flex-wrap"
                onClick={() => onEligibilityChange(opt.value)}
              >
                {opt.label}
                <span className="ml-1 text-[10px] opacity-70">({count})</span>
              </Button>
            )
          })}
        </div>
      ),
    },
  ]

  const actions = (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
        onClick={onReset}
        title="Reset all filters"
      >
        Reset
      </Button>

      {onAiClick && (
        <Button
          variant={aiActive ? 'default' : 'outline'}
          size="icon"
          className={cn(
            'h-8 w-8 shrink-0',
            aiActive && 'bg-violet-600 hover:bg-violet-700 border-violet-600'
          )}
          onClick={onAiClick}
          title="Generate AI load insight"
        >
          <Sparkles className="w-3.5 h-3.5" />
        </Button>
      )}
    </>
  )

  return (
    <ResponsiveFilterBar
      controls={controls}
      className="w-full"
      actions={actions}
    />
  )
}