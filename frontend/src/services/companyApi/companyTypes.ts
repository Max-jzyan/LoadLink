import type { Load } from '../loadApi/loadEnum'
import type { Auction } from '../auctionApi/auctionEnum'

// company returned by GET /api/companies (dev-only until firebase auth is wired up)
export interface Company {
  _id: string
  name: string
  email: string
  companyName: string
  contactName: string
}

// subset of Auction fields returned when auctionId is populated on a load
export type AuctionInfo = Pick<
  Auction,
  '_id' | 'currentPrice' | 'startPrice' | 'capPrice' | 'status' | 'expiresAt' | 'currency'
>

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
