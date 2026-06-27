import { DatePickerWithRange } from '@/components/shared/DatePickerWithRange'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { type DateRange } from 'react-day-picker'

export type CompanyLoadStatusFilter = 'all' | 'active' | 'historical'

export interface CompanyLoadFilters {
  loadStatus: CompanyLoadStatusFilter
  dateRange: DateRange | undefined
}

interface CompanyLoadFilterBarProps {
  filters: CompanyLoadFilters
  onFiltersChange: (filters: CompanyLoadFilters) => void
}

const statusOptions: { value: CompanyLoadStatusFilter; label: string }[] = [
  { value: 'all', label: 'All Loads' },
  { value: 'active', label: 'Active Loads' },
  { value: 'historical', label: 'Historical Loads' },
]

const DEFAULT_FILTERS: CompanyLoadFilters = {
  loadStatus: 'all',
  dateRange: undefined,
}

export { DEFAULT_FILTERS }

export default function CompanyLoadFilterBar({
  filters,
  onFiltersChange,
}: CompanyLoadFilterBarProps) {
  const updateFilter = <K extends keyof CompanyLoadFilters>(
    key: K,
    value: CompanyLoadFilters[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Load Status Tabs */}
      <div className="flex rounded-lg border border-border overflow-hidden w-fit">
        {statusOptions.map((option) => (
          <Button
            key={option.value}
            variant="ghost"
            size="sm"
            className={cn(
              'rounded-none border-0',
              filters.loadStatus === option.value ? 'filter-btn-active' : 'filter-btn-inactive'
            )}
            onClick={() => updateFilter('loadStatus', option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>

      {/* Date Range Picker */}
      <DatePickerWithRange
        label="Date Range"
        onRangeChange={(range) => updateFilter('dateRange', range)}
      />

      {/* Reset Filters Button */}
      <Button variant="outline" size="sm" onClick={() => onFiltersChange({ ...DEFAULT_FILTERS })}>
        Reset Filters
      </Button>
    </div>
  )
}
