import { DatePickerWithRange } from '@/components/shared/DatePickerWithRange'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { TRUCK_TYPES } from '@/types/enums'
import { type DateRange } from 'react-day-picker'
import type { Truck } from '@/services/driverApi/driverEnum'

export type LoadStatusFilter = 'all' | 'active' | 'historical'

export interface DriverLoadFilters {
  loadStatus: LoadStatusFilter
  dateRange: DateRange | undefined
  truckType: string
  minWeight: number | undefined
  maxWeight: number | undefined
  minPrice: number | undefined
  maxPrice: number | undefined
  selectedTruck: string
  origin: string
  destination: string
}

interface DriverLoadFilterBarProps {
  filters: DriverLoadFilters
  onFiltersChange: (filters: DriverLoadFilters) => void
  trucks?: Truck[]
}

function truckDisplayName(t: Truck) {
  return `${t.year} ${t.make} ${t.model} (${t.trailerLengthFt}ft)`
}

const statusOptions: { value: LoadStatusFilter; label: string }[] = [
  { value: 'all', label: 'All Loads' },
  { value: 'active', label: 'Active Loads' },
  { value: 'historical', label: 'Historical Loads' },
]

export default function DriverLoadFilterBar({
  filters,
  onFiltersChange,
  trucks = [],
}: DriverLoadFilterBarProps) {
  const updateFilter = <K extends keyof DriverLoadFilters>(key: K, value: DriverLoadFilters[K]) => {
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

      <Separator orientation="vertical" className="hidden md:block h-6" />

      {/* Date Range Picker */}
      <DatePickerWithRange
        label="Date Range"
        onRangeChange={(range) => updateFilter('dateRange', range)}
      />

      <Separator orientation="vertical" className="hidden md:block h-6" />
      <Separator className="md:hidden w-full" />

      {/* Origin Filter */}
      <Input
        placeholder="Origin city..."
        className="w-36"
        value={filters.origin}
        onChange={(e) => updateFilter('origin', e.target.value)}
      />

      {/* Destination Filter */}
      <Input
        placeholder="Destination city..."
        className="w-36"
        value={filters.destination}
        onChange={(e) => updateFilter('destination', e.target.value)}
      />

      <Separator orientation="vertical" className="hidden md:block h-6" />
      <Separator className="md:hidden w-full" />

      {/* Truck Type Filter */}
      <Select
        value={filters.truckType || 'all'}
        onValueChange={(value) => updateFilter('truckType', value === 'all' ? '' : value)}
      >
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Truck Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Truck Types</SelectItem>
          {TRUCK_TYPES.map((truck) => (
            <SelectItem key={truck.value} value={truck.value}>
              {truck.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* My Truck Filter */}
      <Select
        value={filters.selectedTruck || 'all'}
        onValueChange={(value) => updateFilter('selectedTruck', value === 'all' ? '' : value)}
      >
        <SelectTrigger className="w-44">
          <SelectValue placeholder="My Truck" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Trucks</SelectItem>
          <SelectItem value="none">No Truck</SelectItem>
          {trucks.map((t) => (
            <SelectItem key={t._id} value={t._id}>
              {truckDisplayName(t)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Separator orientation="vertical" className="hidden md:block h-6" />

      {/* Weight Range Filter */}
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-medium whitespace-nowrap">Weight</span>
        <Input
          type="number"
          placeholder="Min"
          className="w-20 h-8"
          value={filters.minWeight ?? ''}
          onChange={(e) =>
            updateFilter('minWeight', e.target.value ? Number(e.target.value) : undefined)
          }
        />
        <span className="text-muted-foreground">-</span>
        <Input
          type="number"
          placeholder="Max"
          className="w-20 h-8"
          value={filters.maxWeight ?? ''}
          onChange={(e) =>
            updateFilter('maxWeight', e.target.value ? Number(e.target.value) : undefined)
          }
        />
      </div>

      {/* Price Range Filter */}
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-medium whitespace-nowrap">Price</span>
        <Input
          type="number"
          placeholder="Min"
          className="w-20 h-8"
          value={filters.minPrice ?? ''}
          onChange={(e) =>
            updateFilter('minPrice', e.target.value ? Number(e.target.value) : undefined)
          }
        />
        <span className="text-muted-foreground">-</span>
        <Input
          type="number"
          placeholder="Max"
          className="w-20 h-8"
          value={filters.maxPrice ?? ''}
          onChange={(e) =>
            updateFilter('maxPrice', e.target.value ? Number(e.target.value) : undefined)
          }
        />
      </div>

      <Separator orientation="vertical" className="hidden md:block h-6" />

      {/* Reset Filters Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() =>
          onFiltersChange({
            loadStatus: 'all',
            dateRange: undefined,
            truckType: '',
            minWeight: undefined,
            maxWeight: undefined,
            minPrice: undefined,
            maxPrice: undefined,
            selectedTruck: '',
            origin: '',
            destination: '',
          })
        }
      >
        Reset Filters
      </Button>
    </div>
  )
}
