import BidInput from '@/components/auction/BidInput'
import BidTable from '@/components/auction/BidTable'
import { DriverMap } from '@/components/driverLoads/Map'
import Col from '@/components/layout/Col'
import DynamicCard from '@/components/layout/DynamicCard'
import LayoutGrid from '@/components/layout/LayoutGrid'
import Row from '@/components/layout/Row'
import { InfoIconPopover } from '@/components/shared/InfoIconPopover'
import { SeparatorWithText } from '@/components/shared/SeparatorWithText'
import { Badge } from '@/components/ui/badge'
import { haversineDistanceKm } from '@/lib/geo'
import type { PopulatedBid } from '@/services/auctionApi/auctionEnum'
import { AUCTION_STATUSES } from '@/services/auctionApi/auctionEnum'
import { useStreamAuctionPriceQuery, useStreamBidsQuery } from '@/services/auctionApi/auctionSlice'
import { selectMongoId } from '@/services/authSlice'
import { useClaimLoadMutation } from '@/services/driverApi/driverSlice'
import { useGetLoadQuery } from '@/services/loadApi/loadSlice'
import { useSelector } from 'react-redux'
import { useParams } from 'react-router-dom'

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
export default function DriverAuctions() {
  // For testing, navigate to /driverAuctions/<valid-mongo-id>
  // TODO: fix the fixed value
  const loadId = useParams<{ loadId: string }>().loadId ?? '';

  const mongoId = useSelector(selectMongoId)
  const { data: load, isLoading, isError } = useGetLoadQuery(loadId)
  const { data: bidsPayload } = useStreamBidsQuery(loadId)
  const { data: pricePayload } = useStreamAuctionPriceQuery(loadId)

  const [claimLoad, { isLoading: isClaiming }] = useClaimLoadMutation()

  const handleClaim = async () => {
    if (!mongoId) {
      alert('You must be logged in to claim a load.')
      return
    }
    try {
      const result = await claimLoad({ loadId, body: { driverId: mongoId } }).unwrap()
      alert(`Load claimed! Final payout: $${result.finalPayout.toLocaleString()}`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to claim load'
      alert(message)
    }
  }

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

  if (isLoading) {
    return (
      <LayoutGrid>
        <Row size={16}>
          <Col>
            <DynamicCard title="Loading load details…" description="Please wait" />
          </Col>
        </Row>
      </LayoutGrid>
    )
  }

  if (isError || !load) {
    return (
      <LayoutGrid>
        <Row size={16}>
          <Col>
            <DynamicCard title="Error" description="Could not load load details." />
          </Col>
        </Row>
      </LayoutGrid>
    )
  }

  // Format helper for weight
  const weightLabel = `${load.weightLbs.toLocaleString()} lbs`
  const trailerLabel = `${load.trailerLengthFt} ft`
  const driverAssistLabel = load.driverAssist ? 'Required' : 'Not Required'
  const certsLabel =
    load.certifications && load.certifications.length > 0 ? load.certifications.join(', ') : 'None'

  return (
    <LayoutGrid>
      <Row size={16}>
        <Col size={8}>
          <DynamicCard
            // companyId is populated by the backend as a full User object
            title={
              typeof load.companyId === 'string'
                ? load.companyId
                : ((load.companyId as { companyName?: string }).companyName ?? 'Company')
            }
            description={`Load ${truncateId(load._id)} · ${timeAgo(load.createdAt)}`}
            action={
              isAuctionLive ? (
                <Badge variant="outline" className="border-green-200 bg-green-50 text-green-800">
                  Active
                </Badge>
              ) : (
                <Badge variant="outline" className="border-red-200 bg-red-50 text-red-800">
                  {auctionStatus === 'cancelled' ? 'Cancelled' : 'Closed'}
                </Badge>
              )
            }
            largeTitle
            noPadding
            noBorder
            noBackground
            rounded="none"
          >
            <Row size={3}>
              <Col size={6}>
                <DynamicCard noBorder>{load.originAddress}</DynamicCard>
              </Col>
              <Col size={1}>
                <DynamicCard noBackground noBorder noPadding rounded="none">
                  {'→'}
                </DynamicCard>
              </Col>
              <Col size={6}>
                <DynamicCard noBorder>{load.destinationAddress}</DynamicCard>
              </Col>
              <Col size={3}>
                <DynamicCard noBorder className="bg-blue-100/70 dark:bg-blue-950/30">
                  {haversineDistanceKm(
                    load.originCoords.lat,
                    load.originCoords.lng,
                    load.destinationCoords.lat,
                    load.destinationCoords.lng
                  )}{' '}
                  km
                </DynamicCard>
              </Col>
            </Row>
            <Row size={2}>
              <Col>
                <h3>Load Specifications</h3>
              </Col>
            </Row>
            <Row size={2}>
              <Col size={4}>
                <DynamicCard title="Truck Type" noBorder size="sm">
                  {load.truckType}
                </DynamicCard>
              </Col>
              <Col size={4}>
                <DynamicCard title="Size" noBorder size="sm">
                  {trailerLabel}
                </DynamicCard>
              </Col>
              <Col size={4}>
                <DynamicCard title="Weight" noBorder size="sm">
                  {weightLabel}
                </DynamicCard>
              </Col>
            </Row>
            <Row size={2}>
              <Col size={4}>
                <DynamicCard title="Commodity" noBorder size="sm">
                  {load.commodity}
                </DynamicCard>
              </Col>
              <Col size={4}>
                <DynamicCard title="Certifications" noBorder size="sm">
                  {certsLabel}
                </DynamicCard>
              </Col>
              <Col size={4}>
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
                >
                  {driverAssistLabel}
                </DynamicCard>
              </Col>
            </Row>
            <Row size={2}>
              <Col>
                <DynamicCard
                  title="Live Auction"
                  action={
                    <InfoIconPopover
                      title="Live Auction"
                      description="This is a live reverse auction. The price ticks down every second as drivers bid lower. You can place a bid or claim the load instantly at the current price."
                      iconClassName="w-5 h-5 text-gray-500 hover:text-gray-700 cursor-help"
                    />
                  }
                  footer={`Current Price $${livePrice.toLocaleString()}`}
                  noFooterStyle
                  noBackground
                  noBorder
                />
              </Col>
            </Row>
            <Row size={1}>
              <Col>
                <button
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleClaim}
                  disabled={isClaiming || !mongoId || !isAuctionLive}
                >
                  {isClaiming
                    ? 'Claiming…'
                    : isAuctionLive
                      ? `Accept $${livePrice.toLocaleString()} Now`
                      : 'Auction Closed'}
                </button>
              </Col>
            </Row>
            <Row size={1}>
              <Col>
                <SeparatorWithText />
              </Col>
            </Row>
            <Row size={2}>
              <Col>
                <BidInput loadId={loadId} auctionStatus={auctionStatus} />
              </Col>
            </Row>
          </DynamicCard>
        </Col>
        <Col size={8}>
          <Row size={8}>
            <Col>
              <DynamicCard
                title="Route Preview"
                action={load.originAddress + ' → ' + load.destinationAddress}
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
            </Col>
          </Row>
          <Row size={8}>
            <Col>
              <DynamicCard
                title="Current Bids"
                action={`${bids.length} Bid${bids.length !== 1 ? 's' : ''}`}
              >
                <BidTable bids={bids} currentDriverId={mongoId ?? undefined} />
              </DynamicCard>
            </Col>
          </Row>
        </Col>
      </Row>
    </LayoutGrid>
  )
}
