import { MapPin } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { AUCTION_STATUSES, type Auction } from '@/services/auctionApi/auctionEnum'
import type { PopulatedLoad } from '@/services/loadApi/loadEnum'
import CountdownTimer from './CountdownTimer'

interface LoadSummaryCardProps {
  load: PopulatedLoad
  auction: Auction
  companyName?: string
}

export default function LoadSummaryCard({ load, auction, companyName }: LoadSummaryCardProps) {
  const isLive = auction.status === AUCTION_STATUSES.Active

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-bold">
          {companyName ? `${companyName} ` : ''}№{load._id.slice(-7)}
        </h2>
        <div className="flex items-center gap-2">
          {isLive && (
            <Badge variant="secondary" className="gap-1">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
              </span>
              LIVE
            </Badge>
          )}
          {isLive && <CountdownTimer expiresAt={auction.expiresAt} />}
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        {load.commodity} · {load.truckType} · {load.weightLbs.toLocaleString()} lbs
      </p>

      <p className="flex items-center gap-2 text-sm font-medium">
        <MapPin className="h-4 w-4 text-muted-foreground" />
        {load.originAddress} → {load.destinationAddress}
      </p>
    </div>
  )
}
