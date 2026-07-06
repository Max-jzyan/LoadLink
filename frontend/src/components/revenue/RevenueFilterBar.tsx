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
import { X } from 'lucide-react'
import { TRUCK_TYPES } from '@/types/enums'
import { DatePickerWithRange } from '@/components/shared/DatePickerWithRange'
import type { RevenueFilters } from '@/services/driverApi/driverEnum'
import { format } from 'date-fns'
import React from 'react'

interface RevenueFilterBarProps {
  filters: RevenueFilters
  onFiltersChange: (filters: RevenueFilters) => void
}

const DEFAULT_FILTERS: RevenueFilters = {
  dateRange: {
    from: new Date(),
    to: new Date()
  },
  truckType: '',
  minPayout: null,
  maxPayout: null,
  origin: '',
  destination: '',
  minDistance: null,
  maxDistance: null,
}

function ActiveFiltersNotice({ filters, onRemoveFilter, onReset }: {
  filters: RevenueFilters
  onRemoveFilter: (key: keyof RevenueFilters) => void
  onReset: () => void
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
    const truckLabel = TRUCK_TYPES.find(t => t.value === filters.truckType)?.label ?? filters.truckType
    activeFilters.push({ key: 'truckType', label: 'Truck', value: truckLabel })
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
      <Button
        variant="ghost"
        size="sm"
        onClick={onReset}
        className="ml-auto text-xs h-7"
      >
        Clear all
      </Button>
    </div>
  )
}

export default function RevenueFilterBar({ filters, onFiltersChange }: RevenueFilterBarProps) {
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
    if (key === 'truckType' || key === 'origin' || key === 'destination') return value !== ''
    if (key === 'minPayout' || key === 'maxPayout' || key === 'minDistance' || key === 'maxDistance') return value !== null
    return false
  })

  // Memoize the date object to prevent unnecessary re-renders
  const dateRange = React.useMemo(() => {
    return filters.dateRange
  }, [filters.dateRange])

  return (
    <div className="flex flex-col gap-2">
      {/* Filter inputs row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Date Range Picker */}
        <DatePickerWithRange
          label="Date Range"
          date={dateRange}
          onRangeChange={(range) => {
            updateFilter('dateRange', range)
          }}
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

        {/* Distance Range Filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium whitespace-nowrap">Distance (km)</span>
          <Input
            type="number"
            placeholder="Min"
            className="w-20 h-8"
            value={filters.minDistance ?? ''}
            onChange={(e) =>
              updateFilter('minDistance', e.target.value ? Number(e.target.value) : null)
            }
          />
          <span className="text-muted-foreground">-</span>
          <Input
            type="number"
            placeholder="Max"
            className="w-20 h-8"
            value={filters.maxDistance ?? ''}
            onChange={(e) =>
              updateFilter('maxDistance', e.target.value ? Number(e.target.value) : null)
            }
          />
        </div>

        {/* Payout Range Filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium whitespace-nowrap">Payout ($)</span>
          <Input
            type="number"
            placeholder="Min"
            className="w-20 h-8"
            value={filters.minPayout ?? ''}
            onChange={(e) =>
              updateFilter('minPayout', e.target.value ? Number(e.target.value) : null)
            }
          />
          <span className="text-muted-foreground">-</span>
          <Input
            type="number"
            placeholder="Max"
            className="w-20 h-8"
            value={filters.maxPayout ?? ''}
            onChange={(e) =>
              updateFilter('maxPayout', e.target.value ? Number(e.target.value) : null)
            }
          />
        </div>

        <Separator orientation="vertical" className="hidden md:block h-6" />

        {/* Reset Filters Button */}
        <Button variant="outline" size="sm" onClick={handleReset} disabled={!hasActiveFilters}>
          Reset Filters
        </Button>
      </div>

      {/* Active filters notice */}
      <ActiveFiltersNotice
        filters={filters}
        onRemoveFilter={handleRemoveFilter}
        onReset={handleReset}
      />
    </div>
  )
}
