import BidInput from '@/components/auction/BidInput'
import ClaimLoadDialog from '@/components/auction/ClaimLoadDialog'
import PriceTracker from '@/components/auction/PriceTracker'
import BidTable from '@/components/auction/BidTable'
import { ProfitLossCard } from '@/components/driverLoads/ProfitLossCard'
import { DriverMap } from '@/components/driverLoads/Map'
import DynamicCard from '@/components/layout/DynamicCard'
import LayoutGrid from '@/components/layout/LayoutGrid'
import PageShell from '@/components/layout/PageShell'
import Row from '@/components/layout/Row'
import Col from '@/components/layout/Col'
import { InfoIconPopover } from '@/components/shared/InfoIconPopover'
import { RateConfirmationBanner } from '@/components/shared/RateConfirmationBanner'
import { SeparatorWithText } from '@/components/shared/SeparatorWithText'
import { Badge } from '@/components/ui/badge'
import { haversineDistanceKm } from '@/lib/geo'
import type { Auction, PopulatedBid } from '@/services/auctionApi/auctionEnum'
import { AUCTION_STATUSES } from '@/services/auctionApi/auctionEnum'
import { useStreamAuctionPriceQuery, useStreamBidsQuery } from '@/services/auctionApi/auctionSlice'
import {
  useListDriverTrucksQuery,
} from '@/services/driverApi/driverSlice'
import { useRequiredMongoId } from '@/hooks/useAuth'
import {
  useGetLoadQuery,
  useGetAcceptedBidQuery,
} from '@/services/loadApi/loadSlice'
import { Calendar, Clock } from 'lucide-react'
import CompanyNameLink from '@/components/shared/CompanyNameLink'
import { useParams } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { setBreadcrumbLabel } from '@/services/breadcrumbSlice'
import type { Truck } from '@/services/driverApi/driverEnum'

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const diffHrs = Math.floor(diffMs / 3_600_000)
  if (diffHrs < 1) return 'Posted less than 1h ago'
  if (diffHrs === 1) return 'Posted 1h ago'
  return `Posted ${diffHrs}h ago`
}

function truncateId(id: string): string {
  return `#${id.slice(-6).toUpperCase()}`
}
// Use 6a30df1af9e53fd472dd8960 as an example load
export default function DriverAuction() {
  // For testing, navigate to /driverAuctions/<valid-mongo-id>
  // TODO: fix the fixed value
  const loadId = useParams<{ loadId: string }>().loadId ?? ''

  const mongoId = useRequiredMongoId()
  const { data: load, isLoading, isError } = useGetLoadQuery(loadId)
  const { data: bidsPayload } = useStreamBidsQuery(loadId)
  const { data: pricePayload } = useStreamAuctionPriceQuery(loadId)
  const dispatch = useDispatch()

  // Push a friendly origin → destination label into the breadcrumb store for the
  // driver auction route (we already have the load). PageLayout reads it instead
  // of showing just the raw id.
  useEffect(() => {
    if (loadId && load) {
      const label = `${load.originAddress.split(',')[0].trim()} → ${load.destinationAddress
        .split(',')[0]
        .trim()}`
      dispatch(
        setBreadcrumbLabel({
          path: `/driverAuctions/${loadId}`,
          label,
        })
      )
    }
  }, [loadId, load, dispatch])

  // Derive bids from SSE payload, falling back to empty array
  const bids: PopulatedBid[] = bidsPayload?.bids ?? []

  // Derive live price from SSE payload, falling back to load's auction snapshot
  const livePrice =
    pricePayload?.currentPrice ??
    (load?.auctionId && typeof load.auctionId === 'object'
      ? (load.auctionId as { currentPrice?: number }).currentPrice
      : null) ??
    0

  // Derive auction status from the populated auction object
  const auctionStatus: string | undefined =
    load?.auctionId && typeof load.auctionId === 'object'
      ? (load.auctionId as { status?: string }).status
      : undefined

  const isAuctionLive = auctionStatus === AUCTION_STATUSES.Active
  const auctionClosed = !isAuctionLive && auctionStatus !== undefined

  // Fetch the accepted bid only when auction is closed (to show RC download)
  const { data: acceptedBid } = useGetAcceptedBidQuery(loadId, {
    skip: !auctionClosed || !loadId,
  })
  const isWinner = acceptedBid?.driverId === mongoId
  const rcUrl = isWinner ? acceptedBid?.rateConfirmationUrl : null

  const [effectiveBidPrice, setEffectiveBidPrice] = useState<number>(livePrice)
  const [bidActive, setBidActive] = useState<boolean>(false)

  const { data: trucks } = useListDriverTrucksQuery(mongoId, { skip: !mongoId })

  // Derive the full auction object from the populated load
  const auction: Auction | null =
    load?.auctionId && typeof load.auctionId === 'object' ? (load.auctionId as Auction) : null

  if (isLoading) {
    return (
      <PageShell title="Load Details" subtitle={truncateId(loadId)}>
        <DynamicCard title="Loading load details…" description="Please wait" />
      </PageShell>
    )
  }

  if (isError || !load) {
    return (
      <PageShell title="Load Details" subtitle={truncateId(loadId)}>
        <DynamicCard title="Error" description="Could not load load details." />
      </PageShell>
    )
  }

  // Format helpers
  const weightLabel = `${load.weightLbs.toLocaleString()} lbs`
  const trailerLabel = `${load.trailerLengthFt} ft`
  const driverAssistLabel = load.driverAssist ? 'Required' : 'Not Required'

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('en-CA', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  const certs =
    load.certifications && load.certifications.length > 0
      ? load.certifications.map((cert) => (
          <Badge key={cert} variant="outline">
            {cert}
          </Badge>
        ))
      : [
          <span key="none" className="text-muted-foreground">
            None
          </span>,
        ]

  const companyDisplayName =
    typeof load.companyId === 'string'
      ? load.companyId
      : ((load.companyId as { companyName?: string }).companyName ?? 'Company')

  const companyIdStr =
    typeof load.companyId === 'string' ? load.companyId : (load.companyId as { _id?: string })._id

  return (
    <PageShell
      title={
        companyIdStr ? (
          <CompanyNameLink name={companyDisplayName} companyId={companyIdStr} />
        ) : (
          companyDisplayName
        )
      }
      subtitle={`Load ${truncateId(load._id)} · ${timeAgo(load.createdAt)}`}
      actions={
        isAuctionLive ? (
          <Badge variant="outline" className="border-green-200 bg-green-50 text-green-800">
            Active
          </Badge>
        ) : (
          <Badge
            variant={auctionStatus === 'cancelled' ? 'destructive' : 'secondary'}
            className="gap-1"
          >
            <Clock className="h-3 w-3" />
            {auctionStatus === 'cancelled' ? 'Cancelled' : 'Closed'}
          </Badge>
        )
      }
      banner={auctionClosed && isWinner ? <RateConfirmationBanner rcUrl={rcUrl} /> : undefined}
    >
      <LayoutGrid>
        <Row size={16} >
          {/* ── Left column ── */}
          <Col size={8}>
            <div className="flex flex-col gap-3 -m-2">
              {/* Route */}
              <div className="flex items-stretch gap-2">
                <div className="flex-1 rounded-lg border bg-card p-3">{load.originAddress}</div>
                <div className="flex items-center justify-center px-2 text-muted-foreground">→</div>
                <div className="flex-1 rounded-lg border bg-card p-3">{load.destinationAddress}</div>
                <div className="flex items-center justify-center rounded-lg border bg-blue-100/70 dark:bg-blue-950/30 border-blue-300/50 dark:border-blue-700/50 px-4 text-sm font-medium">
                  {haversineDistanceKm(
                    load.originCoords.lat,
                    load.originCoords.lng,
                    load.destinationCoords.lat,
                    load.destinationCoords.lng
                  )}{' '}
                  km
                </div>
              </div>

              {/* Specifications */}
              <div className="grid grid-cols-3 gap-2">
                <DynamicCard
                  title="Truck Type"
                  noBorder
                  size="sm"
                  titleClassName="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                >
                  {load.truckType}
                </DynamicCard>
                <DynamicCard
                  title="Size"
                  noBorder
                  size="sm"
                  titleClassName="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                >
                  {trailerLabel}
                </DynamicCard>
                <DynamicCard
                  title="Weight"
                  noBorder
                  size="sm"
                  titleClassName="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                >
                  {weightLabel}
                </DynamicCard>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-2">
                <DynamicCard
                  title="Pickup"
                  noBorder
                  size="sm"
                  titleClassName="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                >
                  <span className="flex items-center gap-1 text-sm">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    {formatDate(load.pickupTime)}
                  </span>
                </DynamicCard>
                <DynamicCard
                  title="Dropoff"
                  noBorder
                  size="sm"
                  titleClassName="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                >
                  <span className="flex items-center gap-1 text-sm">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    {formatDate(load.dropoffTime)}
                  </span>
                </DynamicCard>
              </div>

              {/* Additional Details */}
              <div className="grid grid-cols-3 gap-2">
                <DynamicCard
                  title="Commodity"
                  noBorder
                  size="sm"
                  titleClassName="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                >
                  {load.commodity}
                </DynamicCard>
                <DynamicCard
                  title="Certifications"
                  noBorder
                  size="sm"
                  titleClassName="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                >
                  <span className="flex flex-wrap gap-1">{certs}</span>
                </DynamicCard>
                <DynamicCard
                  title="Driver Assist"
                  action={
                    <InfoIconPopover
                      title="Driver Assistance"
                      description="The driver will be required to assist in the loading/unloading of goods."
                      iconClassName="w-5 h-5 text-gray-500 hover:text-gray-700 cursor-help"
                    />
                  }
                  noBorder
                  size="sm"
                  titleClassName="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                >
                  {driverAssistLabel}
                </DynamicCard>
              </div>

              {/* Live Auction */}
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <h3 className="text-sm font-semibold">Live Auction</h3>
                  <InfoIconPopover
                    title="Live Auction"
                    description="This is a live reverse auction. The price ticks down every second as drivers bid lower. You can place a bid or claim the load instantly at the current price."
                    iconClassName="w-5 h-5 text-gray-500 hover:text-gray-700 cursor-help"
                  />
                </div>
                {auction ? (
                  <PriceTracker auction={auction} currentPrice={livePrice} driver />
                ) : (
                  <p className="text-sm text-muted-foreground">No auction data available</p>
                )}
              </div>

              {/* Claim button */}
              <ClaimLoadDialog
                loadId={loadId}
                driverId={mongoId}
                livePrice={livePrice}
                originAddress={load.originAddress}
                destinationAddress={load.destinationAddress}
                isAuctionLive={isAuctionLive}
              />

              <SeparatorWithText />

              {/* Bid input */}
              <BidInput
                loadId={loadId}
                auctionStatus={auctionStatus}
                currentPrice={livePrice}
                onPriceChange={setEffectiveBidPrice}
                onBidActiveChange={setBidActive}
              />
            </div>
          </Col>

          {/* ── Right column ── */}
          <Col size={8}>
            <div className="flex flex-col gap-3 -m-2">
              <DynamicCard
                title="Route Preview"
                action={load.originAddress + ' → ' + load.destinationAddress}
                titleClassName="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
              >
                <DriverMap
                  routes={[
                    {
                      id: load._id,
                      origin: [load.originCoords.lat, load.originCoords.lng] as [number, number],
                      originName: load.originAddress,
                      destination: [load.destinationCoords.lat, load.destinationCoords.lng] as [
                        number,
                        number,
                      ],
                      destinationName: load.destinationAddress,
                      status: load.status,
                    },
                  ]}
                  height="400px"
                />
              </DynamicCard>

              <ProfitLossCard
                load={load}
                distanceKm={haversineDistanceKm(
                  load.originCoords.lat,
                  load.originCoords.lng,
                  load.destinationCoords.lat,
                  load.destinationCoords.lng
                )}
                bidPrice={effectiveBidPrice}
                trucks={(trucks as Truck[]) ?? []}
                priceLabel={bidActive ? 'Using bid price' : 'Using Accept Now price'}
              />

              <DynamicCard
                title="Current Bids"
                action={
                  <Badge variant="secondary">
                    {bids.length} {bids.length === 1 ? 'bid' : 'bids'}
                  </Badge>
                }
                titleClassName="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
              >
                <BidTable bids={bids} currentDriverId={mongoId || undefined} />
              </DynamicCard>
            </div>
          </Col>
        </Row>
      </LayoutGrid>
    </PageShell>
  )
}