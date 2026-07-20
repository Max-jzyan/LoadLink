export const DRIVER_FRAUD_TYPES: { value: string; label: string }[] = [
  { value: 'fake_load', label: 'Fake or non-existent load posting' },
  { value: 'no_payment', label: 'Refused to pay after delivery' },
  { value: 'bait_switch', label: 'Bait-and-switch on load details' },
  { value: 'identity', label: 'Identity or company impersonation' },
  { value: 'other', label: 'Other fraudulent activity' },
]

export const COMPANY_FRAUD_TYPES: { value: string; label: string }[] = [
  { value: 'fake_credentials', label: 'Fake or forged credentials' },
  { value: 'cargo_theft', label: 'Cargo theft' },
  { value: 'identity', label: 'Identity impersonation' },
  { value: 'billing', label: 'Fraudulent billing or claims' },
  { value: 'other', label: 'Other fraudulent activity' },
]

export type DriverFraudType = (typeof DRIVER_FRAUD_TYPES)[number]['value']
export type CompanyFraudType = (typeof COMPANY_FRAUD_TYPES)[number]['value']
export type FraudType = DriverFraudType | CompanyFraudType

export const LOAD_INACCURACY_TYPES: { value: string; label: string }[] = [
  { value: 'weight', label: 'Incorrect weight or dimensions' },
  { value: 'pickup_delivery', label: 'Wrong pickup or delivery location' },
  { value: 'equipment', label: 'Wrong equipment type required' },
  { value: 'hazmat', label: 'Undisclosed hazmat or special handling' },
  { value: 'dates', label: 'Incorrect pickup or delivery dates' },
  { value: 'other', label: 'Other inaccuracy' },
]

export const DRIVER_INACCURACY_TYPES: { value: string; label: string }[] = [
  { value: 'license', label: 'Incorrect license or certification info' },
  { value: 'equipment', label: 'Wrong equipment or truck type listed' },
  { value: 'location', label: 'Inaccurate home location or service area' },
  { value: 'availability', label: 'Incorrect availability or capacity' },
  { value: 'other', label: 'Other inaccuracy' },
]

export type LoadInaccuracyType = (typeof LOAD_INACCURACY_TYPES)[number]['value']
export type DriverInaccuracyType = (typeof DRIVER_INACCURACY_TYPES)[number]['value']
export type InaccuracyType = LoadInaccuracyType | DriverInaccuracyType
