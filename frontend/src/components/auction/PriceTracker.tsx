import { TrendingUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { formatMoney } from '@/lib/format'
import type { Auction } from '@/services/auctionApi/auctionEnum'

interface PriceTrackerProps {
  auction: Auction
  currentPrice: number
  driver?: boolean
}

export default function PriceTracker({ auction, currentPrice, driver = false }: PriceTrackerProps) {
  const { startPrice, capPrice, autoAcceptPercent, priceCreepAmount, priceCreepIntervalHours } =
    auction

  const range = Math.max(1, capPrice - startPrice)
  const fillPct = Math.min(100, Math.max(0, ((currentPrice - startPrice) / range) * 100))
  const toleranceCeiling = capPrice * (1 + autoAcceptPercent / 100)

  return (
    <div className="space-y-3">
      {!driver && <h3 className="text-sm font-semibold">Auction Price Tracker</h3>}

      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Start {formatMoney(startPrice)}</span>
        <span>Max Cap {formatMoney(capPrice)}</span>
      </div>

      <Progress value={fillPct} />

      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs text-muted-foreground">Current Price</p>
          <p className="text-3xl font-bold text-primary">{formatMoney(currentPrice)}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          {!driver && (
            <Badge variant="secondary">
              Up to {formatMoney(toleranceCeiling)} ({autoAcceptPercent}% above cap)
            </Badge>
          )}
          <Badge variant="outline" className="gap-1 font-normal">
            <TrendingUp className="h-3.5 w-3.5" />+{formatMoney(priceCreepAmount)} every{' '}
            {priceCreepIntervalHours}h
          </Badge>
        </div>
      </div>
    </div>
  )
}
