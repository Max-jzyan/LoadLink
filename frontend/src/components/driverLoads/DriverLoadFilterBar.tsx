import { DatePickerWithRange } from '@/components/shared/DatePickerWithRange'
import ResponsiveFilterBar from '@/components/shared/ResponsiveFilterBar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { Truck } from '@/services/driverApi/driverEnum'
import { TRUCK_TYPES } from '@/types/enums'
import { type DateRange } from 'react-day-picker'

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
    {
      id: 'truckType',
      label: 'Truck Type',
      content: (
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
      ),
    },
    {
      id: 'selectedTruck',
      label: 'My Truck',
      content: (
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
      ),
    },
    {
      id: 'weightRange',
      label: 'Weight Range',
      content: (
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium whitespace-nowrap">Weight</span>
          <Input
            type="number"
            placeholder="Min"
            className="h-8 w-20"
            value={filters.minWeight ?? ''}
            onChange={(e) =>
              updateFilter('minWeight', e.target.value ? Number(e.target.value) : undefined)
            }
          />
          <span className="text-muted-foreground">-</span>
          <Input
            type="number"
            placeholder="Max"
            className="h-8 w-20"
            value={filters.maxWeight ?? ''}
            onChange={(e) =>
              updateFilter('maxWeight', e.target.value ? Number(e.target.value) : undefined)
            }
          />
        </div>
      ),
    },
    {
      id: 'priceRange',
      label: 'Price Range',
      content: (
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium whitespace-nowrap">Price</span>
          <Input
            type="number"
            placeholder="Min"
            className="h-8 w-20"
            value={filters.minPrice ?? ''}
            onChange={(e) =>
              updateFilter('minPrice', e.target.value ? Number(e.target.value) : undefined)
            }
          />
          <span className="text-muted-foreground">-</span>
          <Input
            type="number"
            placeholder="Max"
            className="h-8 w-20"
            value={filters.maxPrice ?? ''}
            onChange={(e) =>
              updateFilter('maxPrice', e.target.value ? Number(e.target.value) : undefined)
            }
          />
        </div>
      ),
    },
  ]

  return (
    <ResponsiveFilterBar
      controls={controls}
      className="w-full"
      actions={
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
      }
    />
  )
}
