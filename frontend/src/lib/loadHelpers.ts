import type { Load } from '@/services/loadApi/loadEnum'

/** Extract the current auction price from a load's populated auction, or 0. */
export function getAuctionPrice(load: Load): number {
  if (typeof load.auctionId === 'object' && load.auctionId && 'currentPrice' in load.auctionId) {
    return (load.auctionId as { currentPrice: number }).currentPrice ?? 0
  }
  return 0
}
