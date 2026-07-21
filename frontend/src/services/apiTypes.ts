export const LoadTag = {
  Load: 'Load',
  Bid: 'Bid',
  AuctionPrice: 'AuctionPrice',
  Truck: 'Truck',
  Trailer: 'Trailer',
  DriverProfile: 'DriverProfile',
  Driver: 'Driver',
  Company: 'Company',
  Review: 'Review',
  Blocklist: 'Blocklist',
  Report: 'Report',
  FeedPrefs: 'FeedPrefs',
  Profile: 'Profile',
  Notification: 'Notification',
  Message: 'Message',
  Auction: 'Auction',
  Admin: 'Admin',
} as const

export type LoadTag = (typeof LoadTag)[keyof typeof LoadTag]

export const LoadTagId = {
  List: 'LIST',
  CompanyList: 'COMPANY_LIST',
  DriverList: 'DRIVER_LIST',
} as const

export type LoadTagId = (typeof LoadTagId)[keyof typeof LoadTagId]

// Tag description type for RTK Query tagging system
// The id can be a string, LoadTagId, or undefined when result is potentially null
export type TagDescription = { type: LoadTag; id?: string | LoadTagId }
