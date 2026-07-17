import ResponsiveFilterBar, { type ResponsiveFilterControl } from '@/components/shared/ResponsiveFilterBar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { Search } from 'lucide-react'

export type AuctionStatusFilter = 'all' | 'live' | 'closed' | 'cancelled'

export interface CompanyAuctionFilters {
  status: AuctionStatusFilter
  origin: string
  destination: string
  minPrice: number | null
  maxPrice: number | null
  search: string
}

interface CompanyAuctionFilterBarProps {
  filters: CompanyAuctionFilters
  onFiltersChange: (filters: CompanyAuctionFilters) => void
}

const statusOptions: { value: AuctionStatusFilter; label: string }[] = [
  { value: 'all', label: 'All Auctions' },
  { value: 'live', label: 'Live' },
  { value: 'closed', label: 'Closed' },
  { value: 'cancelled', label: 'Cancelled' },
]

const DEFAULT_FILTERS: CompanyAuctionFilters = {
  status: 'all',
  origin: '',
  destination: '',
  minPrice: null,
  maxPrice: null,
  search: '',
}

export { DEFAULT_FILTERS }

export default function CompanyAuctionFilterBar({
  filters,
  onFiltersChange,
}: CompanyAuctionFilterBarProps) {
  const updateFilter = <K extends keyof CompanyAuctionFilters>(
    key: K,
    value: CompanyAuctionFilters[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const controls: ResponsiveFilterControl[] = [
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
                filters.status === option.value ? 'filter-btn-active' : 'filter-btn-inactive'
              )}
              onClick={() => updateFilter('status', option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      ),
    },
    {
      id: 'search',
      label: 'Search',
      content: (
        <div className="relative w-52">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            className="pl-8 h-8 text-sm"
            placeholder="Search loads, companies..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
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
      id: 'priceRange',
      label: 'Price Range',
      content: (
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium whitespace-nowrap">Price ($)</span>
          <Input
            type="number"
            placeholder="Min"
            className="h-8 w-20"
            value={filters.minPrice ?? ''}
            onChange={(e) =>
              updateFilter('minPrice', e.target.value ? Number(e.target.value) : null)
            }
          />
          <span className="text-muted-foreground">-</span>
          <Input
            type="number"
            placeholder="Max"
            className="h-8 w-20"
            value={filters.maxPrice ?? ''}
            onChange={(e) =>
              updateFilter('maxPrice', e.target.value ? Number(e.target.value) : null)
            }
          />
        </div>
      ),
    },
  ]

  const hasActiveFilters = Object.entries(filters).some(([key, value]) => {
    if (key === 'status') return value !== 'all'
    if (key === 'origin' || key === 'destination' || key === 'search') return value !== ''
    if (key === 'minPrice' || key === 'maxPrice') return value !== null
    return false
  })

  return (
    <ResponsiveFilterBar
      controls={controls}
      className="w-full"
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={() => onFiltersChange({ ...DEFAULT_FILTERS })}
          disabled={!hasActiveFilters}
        >
          Reset Filters
        </Button>
      }
    />
  )
}