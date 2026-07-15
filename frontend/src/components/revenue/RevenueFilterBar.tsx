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
import type { RevenueFilters, Truck } from '@/services/driverApi/driverEnum'
import { TRUCK_TYPES } from '@/types/enums'
import { format } from 'date-fns'
import { X } from 'lucide-react'
import React from 'react'

interface RevenueFilterBarProps {
  filters: RevenueFilters
  onFiltersChange: (filters: RevenueFilters) => void
  trucks?: Truck[]
}

const DEFAULT_FILTERS: RevenueFilters = {
  dateRange: {
    from: undefined,
    to: undefined,
  },
  truckType: '',
  selectedTruck: '',
  minPayout: null,
  maxPayout: null,
  origin: '',
  destination: '',
  minDistance: null,
  maxDistance: null,
}

function truckDisplayName(t: Truck) {
  return `${t.year} ${t.make} ${t.model} (${t.trailerLengthFt}ft)`
}

function ActiveFiltersNotice({
  filters,
  onRemoveFilter,
  onReset,
  trucks,
}: {
  filters: RevenueFilters
  onRemoveFilter: (key: keyof RevenueFilters) => void
  onReset: () => void
  trucks: Truck[]
}) {
  const activeFilters: { key: keyof RevenueFilters; label: string; value: string }[] = []

  if (filters.dateRange?.from || filters.dateRange?.to) {
    let dateLabel: string
    if (filters.dateRange.from && filters.dateRange.to) {
      dateLabel = `${format(filters.dateRange.from, 'yyyy-MM-dd')} - ${format(filters.dateRange.to, 'yyyy-MM-dd')}`
    } else if (filters.dateRange.from) {
      dateLabel = `From ${format(filters.dateRange.from, 'yyyy-MM-dd')}`
    } else {
      dateLabel = `Until ${format(filters.dateRange.to ?? '', 'yyyy-MM-dd')}`
    }
    activeFilters.push({ key: 'dateRange', label: 'Date', value: dateLabel })
  }

  if (filters.truckType) {
    const truckLabel =
      TRUCK_TYPES.find((t) => t.value === filters.truckType)?.label ?? filters.truckType
    activeFilters.push({ key: 'truckType', label: 'Truck', value: truckLabel })
  }

  if (filters.selectedTruck) {
    const selectedTruck = trucks.find((t) => t._id === filters.selectedTruck)
    let truckName = filters.selectedTruck

    if (filters.selectedTruck === 'none') {
      truckName = 'No Truck'
    } else if (selectedTruck) {
      truckName = truckDisplayName(selectedTruck)
    }

    activeFilters.push({ key: 'selectedTruck', label: 'My Truck', value: truckName })
  }

  if (filters.origin) {
    activeFilters.push({ key: 'origin', label: 'Origin', value: filters.origin })
  }

  if (filters.destination) {
    activeFilters.push({ key: 'destination', label: 'Destination', value: filters.destination })
  }

  if (filters.minDistance !== null || filters.maxDistance !== null) {
    let distLabel: string
    if (filters.minDistance !== null && filters.maxDistance !== null) {
      distLabel = `${filters.minDistance}–${filters.maxDistance} km`
    } else if (filters.minDistance !== null) {
      distLabel = `≥ ${filters.minDistance} km`
    } else {
      distLabel = `≤ ${filters.maxDistance} km`
    }
    activeFilters.push({ key: 'minDistance', label: 'Distance', value: distLabel })
  }

  if (filters.minPayout !== null || filters.maxPayout !== null) {
    let payoutLabel: string
    if (filters.minPayout !== null && filters.maxPayout !== null) {
      payoutLabel = `$${filters.minPayout}–$${filters.maxPayout}`
    } else if (filters.minPayout !== null) {
      payoutLabel = `≥ $${filters.minPayout}`
    } else {
      payoutLabel = `≤ $${filters.maxPayout}`
    }
    activeFilters.push({ key: 'minPayout', label: 'Payout', value: payoutLabel })
  }

  if (activeFilters.length === 0) return null

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-md border border-border">
      <span className="text-xs font-medium text-muted-foreground">Active filters:</span>
      <div className="flex flex-wrap items-center gap-1.5">
        {activeFilters.map(({ key, label, value }) => (
          <span
            key={key}
            className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-background border border-border rounded-md"
          >
            <span className="text-muted-foreground">{label}:</span>
            <span>{value}</span>
            <button
              type="button"
              onClick={() => onRemoveFilter(key)}
              className="ml-0.5 hover:text-destructive transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <Button variant="ghost" size="sm" onClick={onReset} className="ml-auto text-xs h-7">
        Clear all
      </Button>
    </div>
  )
}

export default function RevenueFilterBar({
  filters,
  onFiltersChange,
  trucks = [],
}: RevenueFilterBarProps) {
  const updateFilter = <K extends keyof RevenueFilters>(key: K, value: RevenueFilters[K]) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const handleReset = () => {
    onFiltersChange(DEFAULT_FILTERS)
  }

  const handleRemoveFilter = (key: keyof RevenueFilters) => {
    onFiltersChange({ ...filters, [key]: DEFAULT_FILTERS[key] })
  }

  const hasActiveFilters = Object.entries(filters).some(([key, value]) => {
    if (key === 'dateRange') return value !== undefined
    if (key === 'truckType' || key === 'origin' || key === 'destination' || key === 'selectedTruck')
      return value !== ''
    if (
      key === 'minPayout' ||
      key === 'maxPayout' ||
      key === 'minDistance' ||
      key === 'maxDistance'
    )
      return value !== null
    return false
  })

  // Memoize the date object to prevent unnecessary re-renders
  const dateRange = React.useMemo(() => {
    return filters.dateRange
  }, [filters.dateRange])

  const controls = [
    {
      id: 'dateRange',
      label: 'Date Range',
      content: (
        <div className="min-w-[180px]">
          <DatePickerWithRange
            label="Date Range"
            date={dateRange}
            onRangeChange={(range) => {
              updateFilter('dateRange', range)
            }}
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
      id: 'distanceRange',
      label: 'Distance Range',
      content: (
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium whitespace-nowrap">Distance (km)</span>
          <Input
            type="number"
            placeholder="Min"
            className="h-8 w-20"
            value={filters.minDistance ?? ''}
            onChange={(e) =>
              updateFilter('minDistance', e.target.value ? Number(e.target.value) : null)
            }
          />
          <span className="text-muted-foreground">-</span>
          <Input
            type="number"
            placeholder="Max"
            className="h-8 w-20"
            value={filters.maxDistance ?? ''}
            onChange={(e) =>
              updateFilter('maxDistance', e.target.value ? Number(e.target.value) : null)
            }
          />
        </div>
      ),
    },
    {
      id: 'payoutRange',
      label: 'Payout Range',
      content: (
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium whitespace-nowrap">Payout ($)</span>
          <Input
            type="number"
            placeholder="Min"
            className="h-8 w-20"
            value={filters.minPayout ?? ''}
            onChange={(e) =>
              updateFilter('minPayout', e.target.value ? Number(e.target.value) : null)
            }
          />
          <span className="text-muted-foreground">-</span>
          <Input
            type="number"
            placeholder="Max"
            className="h-8 w-20"
            value={filters.maxPayout ?? ''}
            onChange={(e) =>
              updateFilter('maxPayout', e.target.value ? Number(e.target.value) : null)
            }
          />
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-2">
      <ResponsiveFilterBar
        controls={controls}
        className="w-full"
        actions={
          <Button variant="outline" size="sm" onClick={handleReset} disabled={!hasActiveFilters}>
            Reset Filters
          </Button>
        }
      />

      <ActiveFiltersNotice
        filters={filters}
        onRemoveFilter={handleRemoveFilter}
        onReset={handleReset}
        trucks={trucks}
      />
    </div>
  )
}
