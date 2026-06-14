export const LoadTag = {
  Load: 'Load',
} as const

export type LoadTag = (typeof LoadTag)[keyof typeof LoadTag]

export const LoadTagId = {
  List: 'LIST',
  CompanyList: 'COMPANY_LIST',
} as const

export type LoadTagId = (typeof LoadTagId)[keyof typeof LoadTagId]
