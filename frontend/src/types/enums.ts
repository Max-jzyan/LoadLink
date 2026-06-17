export const PriceInputVariant = {
  AMOUNT: 'amount',
  ESCALATION: 'escalation',
} as const

export type PriceInputVariant = (typeof PriceInputVariant)[keyof typeof PriceInputVariant]
