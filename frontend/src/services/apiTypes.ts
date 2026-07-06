export const LoadTag = {
  Load: 'Load',
  Bid: 'Bid',
  AuctionPrice: 'AuctionPrice',
  Truck: 'Truck',
  DriverProfile: 'DriverProfile',
  Driver: 'Driver',
  Review: 'Review',
} as const

export type LoadTag = (typeof LoadTag)[keyof typeof LoadTag]

export const LoadTagId = {
  List: 'LIST',
  CompanyList: 'COMPANY_LIST',
  DriverList: 'DRIVER_LIST',
} as const

export type LoadTagId = (typeof LoadTagId)[keyof typeof LoadTagId]
