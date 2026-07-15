import { DatePickerWithRange } from '@/components/shared/DatePickerWithRange'
import ResponsiveFilterBar from '@/components/shared/ResponsiveFilterBar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { type DateRange } from 'react-day-picker'

export type CompanyLoadStatusFilter = 'all' | 'active' | 'historical'

export interface CompanyLoadFilters {
  loadStatus: CompanyLoadStatusFilter
  dateRange: DateRange | undefined
  origin: string
  destination: string
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
  origin: '',
  destination: '',
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

  const controls = [
    {
      id: 'status',
      label: 'Status',
      content: (
        <div className="flex w-fit overflow-hidden rounded-lg border border-border">
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
      ),
    },
    {
      id: 'dateRange',
      label: 'Date Range',
      content: (
        <div className="min-w-[180px]">
          <DatePickerWithRange
            label="Date Range"
            date={filters.dateRange}
            onRangeChange={(range) => updateFilter('dateRange', range)}
          />
        </div>
      ),
    },
    {
      id: 'origin',
      label: 'Origin',
      content: (
        <Input
          placeholder="Origin city..."
          className="w-36"
          value={filters.origin}
          onChange={(e) => updateFilter('origin', e.target.value)}
        />
      ),
    },
    {
      id: 'destination',
      label: 'Destination',
      content: (
        <Input
          placeholder="Destination city..."
          className="w-36"
          value={filters.destination}
          onChange={(e) => updateFilter('destination', e.target.value)}
        />
      ),
    },
  ]

  return (
    <ResponsiveFilterBar
      controls={controls}
      className="w-full"
      actions={
        <Button variant="outline" size="sm" onClick={() => onFiltersChange({ ...DEFAULT_FILTERS })}>
          Reset Filters
        </Button>
      }
    />
  )
}
