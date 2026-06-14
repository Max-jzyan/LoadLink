// src/constants/enums.ts
export const TRUCK_TYPES = {
  DryVan: 'DryVan',
  Reefer: 'Reefer',
  Flatbed: 'Flatbed',
  StepDeck: 'StepDeck',
  PowerOnly: 'PowerOnly',
  Tanker: 'Tanker',
} as const

export const LOAD_STATUSES = {
  Draft: 'draft',
  AuctionLive: 'auction_live',
  AuctionClosed: 'auction_closed',
  Booked: 'booked',
  InTransit: 'in_transit',
  Completed: 'completed',
  Cancelled: 'cancelled',
} as const

export const USER_ROLES = {
  DRIVER: 'driver',
  COMPANY: 'company',
  ADMIN: 'admin',
} as const

export const BID_STATUSES = {
  Draft: 'draft',
  Submitted: 'submitted',
  Withdrawn: 'withdrawn',
  Rejected: 'rejected',
  Accepted: 'accepted',
  Expired: 'expired',
} as const

// Derived helpers
export const TRUCK_TYPE_VALUES = Object.values(TRUCK_TYPES)
export type TruckType = (typeof TRUCK_TYPE_VALUES)[number]

export const LOAD_STATUS_VALUES = Object.values(LOAD_STATUSES)
export type LoadStatus = (typeof LOAD_STATUS_VALUES)[number]

export const USER_ROLE_VALUES = Object.values(USER_ROLES)
export type UserRole = (typeof USER_ROLE_VALUES)[number]

export const BID_STATUS_VALUES = Object.values(BID_STATUSES)
export type BidStatus = (typeof BID_STATUS_VALUES)[number]
