import type { LoadWithDetails } from '@/services/companyApi/companyTypes'
import { LOAD_STATUSES } from '@/types/enums'

/**
 * A company load flattened for spend analytics. Price comes from the auction's
 * current price — the amount the company pays (or will pay) the driver.
 */
export interface SpendLoad {
  loadId: string
  originAddress: string
  destinationAddress: string
  price: number
  distanceKm: number
  /** Delivery date used for time grouping */
  date: string
  truckType: string
  status: string
  /** true when the load is booked/in transit — money committed but not yet spent */
  committed: boolean
}

export interface SpendSummary {
  totalSpend: number
  committedSpend: number
  completedCount: number
  committedCount: number
  avgCostPerLoad: number
  avgCostPerKm: number
}

const COMMITTED_STATUSES = new Set<string>([LOAD_STATUSES.Booked, LOAD_STATUSES.InTransit])

/**
 * Flatten dashboard loads into spend entries. Only loads with an auction and a
 * price are included — completed loads count as spend, booked/in-transit as
 * committed spend.
 */
export function deriveSpendLoads(loads: LoadWithDetails[]): SpendLoad[] {
  return loads
    .filter(
      (l) =>
        l.auctionId != null &&
        (l.status === LOAD_STATUSES.Completed || COMMITTED_STATUSES.has(l.status))
    )
    .map((l) => ({
      loadId: l._id,
      originAddress: l.originAddress,
      destinationAddress: l.destinationAddress,
      price: l.auctionId?.currentPrice ?? 0,
      distanceKm: l.route?.distanceKm ?? 0,
      date: l.dropoffTime ?? l.createdAt,
      truckType: l.truckType,
      status: l.status,
      committed: COMMITTED_STATUSES.has(l.status),
    }))
}

export function summarizeSpend(spendLoads: SpendLoad[]): SpendSummary {
  const completed = spendLoads.filter((l) => !l.committed)
  const committed = spendLoads.filter((l) => l.committed)

  const totalSpend = completed.reduce((sum, l) => sum + l.price, 0)
  const committedSpend = committed.reduce((sum, l) => sum + l.price, 0)

  const withDistance = completed.filter((l) => l.distanceKm > 0)
  const totalKm = withDistance.reduce((sum, l) => sum + l.distanceKm, 0)
  const spendWithDistance = withDistance.reduce((sum, l) => sum + l.price, 0)

  return {
    totalSpend,
    committedSpend,
    completedCount: completed.length,
    committedCount: committed.length,
    avgCostPerLoad: completed.length > 0 ? totalSpend / completed.length : 0,
    avgCostPerKm: totalKm > 0 ? spendWithDistance / totalKm : 0,
  }
}
