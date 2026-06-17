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

export const USER_ROLES = {
  DRIVER: 'driver',
  COMPANY: 'company',
  ADMIN: 'admin',
} as const

export type USER_ROLES = (typeof USER_ROLES)[keyof typeof USER_ROLES]
