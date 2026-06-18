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

export const USER_ROLES = {
  DRIVER: 'driver',
  COMPANY: 'company',
  ADMIN: 'admin',
} as const

export type USER_ROLES = (typeof USER_ROLES)[keyof typeof USER_ROLES]
