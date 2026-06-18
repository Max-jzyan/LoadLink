import { ArrowRight, CalendarClock, MapPin, Truck, Weight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import type { AuctionSummary, CompanySummary, Load, LoadStatus } from '@/services/loadApi/loadEnum'

const STATUS_BADGE: Record<LoadStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-muted text-muted-foreground' },
  auction_live: {
    label: 'Live Auction',
    className: 'bg-green-500/15 text-green-600 dark:text-green-400',
  },
  auction_closed: {
    label: 'Auction Closed',
    className: 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400',
  },
  booked: { label: 'Booked', className: 'bg-blue-500/15 text-blue-600 dark:text-blue-400' },
  in_transit: {
    label: 'In Transit',
    className: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
  },
  completed: {
    label: 'Completed',
    className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  },
  cancelled: { label: 'Cancelled', className: 'bg-destructive/15 text-destructive' },
}

// Helpers
function fmt(iso: string) {
  return new Date(iso).toLocaleString('en-CA', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: false,
  })
}

function isPopulatedAuction(value: Load['auctionId']): value is AuctionSummary {
  return typeof value === 'object' && value !== null && 'currentPrice' in value
}

function isPopulatedCompany(value: Load['companyId']): value is CompanySummary {
  return typeof value === 'object' && value !== null && 'companyName' in value
}

// Load card
interface LoadCardProps {
  load: Load
  onClick?: () => void
}

export function LoadCard({ load, onClick }: LoadCardProps) {
  const auction = isPopulatedAuction(load.auctionId) ? load.auctionId : null
  const company = isPopulatedCompany(load.companyId) ? load.companyId : null
  const badge = STATUS_BADGE[load.status] ?? STATUS_BADGE.draft

  return (
    <Card
      className={`rounded-xl overflow-hidden transition-colors cursor-pointer hover:bg-muted/40`}
      onClick={onClick}
    >
      <CardContent className="px-4 py-3 flex flex-row items-stretch gap-0">
        <div className="flex flex-col gap-1.5 flex-1 min-w-0 justify-center">
          {/* Company and item */}
          <div className="flex items-baseline gap-1.5">
            {company && (
              <>
                <span className="text-base font-bold leading-tight">{company.companyName}</span>
                <span className="text-muted-foreground text-sm">-</span>
              </>
            )}
            <span
              className={`leading-tight ${company ? 'text-sm text-muted-foreground' : 'text-base font-bold'}`}
            >
              {load.commodity}
            </span>
          </div>

          {/* Route */}
          <div className="flex items-center gap-1.5 text-sm font-semibold min-w-0">
            <MapPin size={12} className="text-muted-foreground shrink-0" />
            <span className="truncate">{load.originAddress}</span>
            <ArrowRight size={12} className="text-muted-foreground shrink-0" />
            <span className="truncate">{load.destinationAddress}</span>
          </div>

          {/* Details */}
          <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Truck size={11} className="shrink-0" />
              {load.trailerLengthFt}ft {load.truckType}
            </span>

            <span className="flex items-center gap-1">
              <Weight size={11} className="shrink-0" />
              {load.weightLbs.toLocaleString()} lbs
            </span>

            <span className="flex items-center gap-1">
              <CalendarClock size={11} className="shrink-0" />
              {fmt(load.pickupTime)} → {fmt(load.dropoffTime)}
            </span>

            {load.driverAssist && (
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[11px]">Driver Assist</span>
            )}

            {load.certifications && load.certifications.length > 0 && (
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[11px]">
                {load.certifications.join(', ')}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-center justify-between shrink-0 py-0.5 min-w-[160px] gap-1">
          {/* Status badge at the top */}
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${badge.className}`}
          >
            <span className="size-1.5 rounded-full bg-current opacity-70" />
            {badge.label}
          </span>

          {/* Prices */}
          {auction ? (
            <div className="flex items-center gap-4 mt-1">
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground/60">
                  Best Bid
                </span>
                <span
                  className={`text-lg font-bold tabular-nums ${
                    auction.bestBidAmount != null ? 'text-foreground' : 'text-muted-foreground/30'
                  }`}
                >
                  {auction.bestBidAmount != null
                    ? `$${auction.bestBidAmount.toLocaleString('en-CA')}`
                    : '—'}
                </span>
              </div>
              <div className="w-px h-8 bg-border" />
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground/60">
                  Accept Now
                </span>
                <span className="text-lg font-bold tabular-nums text-primary">
                  ${auction.currentPrice.toLocaleString('en-CA')}
                </span>
              </div>
            </div>
          ) : (
            <div /> // spacer to keep the badge at top
          )}
        </div>
      </CardContent>
    </Card>
  )
}
