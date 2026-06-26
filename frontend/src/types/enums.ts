export const PriceInputVariant = {
  AMOUNT: 'amount',
  ESCALATION: 'escalation',
} as const

export type PriceInputVariant = (typeof PriceInputVariant)[keyof typeof PriceInputVariant]

export const TRUCK_TYPES: { label: string; value: string }[] = [
  { label: 'Dry Van', value: 'DryVan' },
  { label: 'Refrigerated Van', value: 'Reefer' },
  { label: 'Flatbed', value: 'Flatbed' },
  { label: 'Step Deck', value: 'StepDeck' },
  { label: 'Power Only', value: 'PowerOnly' },
  { label: 'Tanker', value: 'Tanker' },
]

export const LOAD_STATUSES = {
  Draft: 'draft',
  AuctionLive: 'auction_live',
  AuctionClosed: 'auction_closed',
  Booked: 'booked',
  InTransit: 'in_transit',
  Completed: 'completed',
  Cancelled: 'cancelled',
} as const

export type LoadStatus = (typeof LOAD_STATUSES)[keyof typeof LOAD_STATUSES]

/** Set of load statuses considered "active" for dashboard filtering */
export const ACTIVE_STATUSES = new Set<string>([
  LOAD_STATUSES.AuctionLive,
  LOAD_STATUSES.Booked,
  LOAD_STATUSES.InTransit,
])

/** Set of load statuses considered "historical" for dashboard filtering */
export const HISTORICAL_STATUSES = new Set<string>([
  LOAD_STATUSES.Completed,
  LOAD_STATUSES.Cancelled,
  LOAD_STATUSES.AuctionClosed,
])

export const TimelineEventAction = {
  Start: 'Start',
  Break: 'Break',
  Rest: 'Rest',
  Refuel: 'Refuel',
  Complete: 'Complete',
} as const
export type TimelineEventAction = (typeof TimelineEventAction)[keyof typeof TimelineEventAction]

export const TimelineIconType = {
  Pickup: 'pickup',
  Rest: 'rest',
  Sleep: 'sleep',
  Fuel: 'fuel',
  Delivery: 'delivery',
} as const
export type TimelineIconType = (typeof TimelineIconType)[keyof typeof TimelineIconType]

export const USER_ROLES = {
  DRIVER: 'driver',
  COMPANY: 'company',
  ADMIN: 'admin',
} as const

export type USER_ROLES = (typeof USER_ROLES)[keyof typeof USER_ROLES]
