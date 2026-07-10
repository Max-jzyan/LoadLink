export type SortKey =
  | 'recommended'
  | 'pickup_asc'
  | 'pickup_desc'
  | 'dropoff_asc'
  | 'dropoff_desc'
  | 'rate'
  | 'distance'

export type EligibilityFilter = 'all' | 'eligible' | 'issues'

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'pickup_asc', label: 'Pickup Date (earliest)' },
  { value: 'pickup_desc', label: 'Pickup Date (latest)' },
  { value: 'dropoff_asc', label: 'Dropoff Date (earliest)' },
  { value: 'dropoff_desc', label: 'Dropoff Date (latest)' },
  { value: 'rate', label: 'Rate (highest first)' },
  { value: 'distance', label: 'Distance (shortest)' },
]

export const FILTER_OPTIONS: { value: EligibilityFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'eligible', label: 'Eligible' },
  { value: 'issues', label: 'Issues' },
]
