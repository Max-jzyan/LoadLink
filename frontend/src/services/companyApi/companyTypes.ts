import type { Load } from '../loadApi/loadEnum'

// company returned by GET /api/companies (dev-only until firebase auth is wired up)
export interface Company {
  _id: string
  name: string
  email: string
  companyName: string
  contactName: string
}

// auction doc as populated on a load (server side populates auctionId field)
export interface AuctionInfo {
  _id: string
  currentPrice: number
  startPrice: number
  capPrice: number
  status: string
  expiresAt: string
  currency: string
}

// load enriched with bid count and populated auction, returned by GET /api/company/:id/dashboard
export interface LoadWithDetails extends Omit<Load, 'auctionId'> {
  bidCount: number
  auctionId: AuctionInfo | null
}

export interface DashboardSummary {
  activeLoads: number
  liveAuctions: number
  inTransit: number
  totalBidsToday: number
}

export interface CompanyDashboardData {
  loads: LoadWithDetails[]
  summary: DashboardSummary
}
