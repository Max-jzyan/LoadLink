import { DriverMap } from '@/components/driverLoads/Map'
import Col from '@/components/layout/Col'
import DynamicCard from '@/components/layout/DynamicCard'
import PageShell from '@/components/layout/PageShell'
import Row from '@/components/layout/Row'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RoutePath } from '@/config/routes'
import { formatMoney } from '@/lib/format'
import { useGetLoadQuery } from '@/services/loadApi/loadSlice'
import { LOAD_STATUSES } from '@/types/enums'
import {
  ArrowLeft,
  Calendar,
  Gavel,
  Loader2,
  MapPin,
  Package2,
  Pencil,
  Truck,
  Weight,
} from 'lucide-react'
import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'

const NON_EDITABLE_STATUSES: readonly string[] = [
  LOAD_STATUSES.InTransit,
  LOAD_STATUSES.Booked,
  LOAD_STATUSES.Completed,
  LOAD_STATUSES.Cancelled,
]

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

function DetailField({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium break-words">{value}</p>
      </div>
    </div>
  )
}

export default function LoadDetail() {
  const { loadId } = useParams<{ loadId: string }>()
  const { data: load, isLoading, isError } = useGetLoadQuery(loadId ?? '', { skip: !loadId })

  const auction = load?.auctionId ?? null
  const canEdit = load ? !NON_EDITABLE_STATUSES.includes(load.status) : false
  const isAuctionLive = load?.status === LOAD_STATUSES.AuctionLive

  const routes = useMemo(() => {
    if (!load) return []
    return [
      {
        id: load._id,
        origin: [load.originCoords.lat, load.originCoords.lng] as [number, number],
        originName: load.originAddress,
        destination: [load.destinationCoords.lat, load.destinationCoords.lng] as [number, number],
        destinationName: load.destinationAddress,
        status: load.status,
        polyline: load.route?.polyline,
      },
    ]
  }, [load])

  if (isLoading) {
    return (
      <PageShell title="Load Details">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PageShell>
    )
  }

  if (isError || !load) {
    return (
      <PageShell title="Load Details">
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <p className="text-destructive">Failed to load this load. It may have been removed.</p>
          <Button variant="outline" asChild>
            <Link to={RoutePath.Loads}>
              <ArrowLeft className="h-4 w-4" />
              Back to Loads
            </Link>
          </Button>
        </div>
      </PageShell>
    )
  }

  const originShort = load.originAddress.split(',')[0].trim()
  const destinationShort = load.destinationAddress.split(',')[0].trim()

  return (
    <PageShell
      title="Load Details"
      subtitle={`${originShort} → ${destinationShort} · Load #${load._id.slice(-6).toUpperCase()}`}
      actions={
        <>
          <Button variant="outline" size="sm" asChild>
            <Link to={RoutePath.Loads}>
              <ArrowLeft className="h-4 w-4" />
              Back to Loads
            </Link>
          </Button>
          {canEdit && (
            <Button variant="outline" size="sm" asChild>
              <Link to={`/loads/${load._id}/edit`}>
                <Pencil className="h-4 w-4" />
                Edit Load
              </Link>
            </Button>
          )}
          {auction && (
            <Button size="sm" asChild>
              <Link to={`${RoutePath.AuctionLive}/${load._id}`}>
                <Gavel className="h-4 w-4" />
                {isAuctionLive ? 'View Live Auction' : 'View Auction'}
              </Link>
            </Button>
          )}
        </>
      }
    >
      <Row stackAt="lg">
        <Col size={9}>
          <Row>
            <Col size={16}>
              <DynamicCard title="Load Information" action={<StatusBadge status={load.status} />}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                  <DetailField icon={MapPin} label="Origin" value={load.originAddress} />
                  <DetailField icon={MapPin} label="Destination" value={load.destinationAddress} />
                  <DetailField
                    icon={Calendar}
                    label="Pickup"
                    value={formatDateTime(load.pickupTime)}
                  />
                  <DetailField
                    icon={Calendar}
                    label="Dropoff"
                    value={formatDateTime(load.dropoffTime)}
                  />
                  <DetailField icon={Package2} label="Commodity" value={load.commodity} />
                  <DetailField
                    icon={Weight}
                    label="Weight"
                    value={`${load.weightLbs.toLocaleString()} lbs`}
                  />
                  <DetailField
                    icon={Truck}
                    label="Truck"
                    value={`${load.truckType} · ${load.trailerLengthFt} ft trailer`}
                  />
                  {load.route?.distanceKm ? (
                    <DetailField
                      icon={MapPin}
                      label="Distance"
                      value={`${Math.round(load.route.distanceKm).toLocaleString()} km`}
                    />
                  ) : null}
                </div>
                {(load.certifications?.length || load.driverAssist) && (
                  <div className="flex flex-wrap items-center gap-1.5 mt-4 pt-4 border-t">
                    <span className="text-xs text-muted-foreground mr-1">Requirements:</span>
                    {load.certifications?.map((cert) => (
                      <Badge key={cert} variant="outline" className="text-xs">
                        {cert}
                      </Badge>
                    ))}
                    {load.driverAssist && (
                      <Badge variant="outline" className="text-xs">
                        Driver Assist
                      </Badge>
                    )}
                  </div>
                )}
              </DynamicCard>
            </Col>
          </Row>
          <Row>
            <Col size={16}>
              <DynamicCard
                title="Auction"
                description={
                  auction
                    ? 'Pricing set when this load was posted.'
                    : 'No auction has been created for this load yet.'
                }
              >
                {auction ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Current Price</p>
                      <p className="text-2xl font-bold">{formatMoney(auction.currentPrice)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Start Price</p>
                      <p className="text-2xl font-bold">{formatMoney(auction.startPrice)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Cap Price</p>
                      <p className="text-2xl font-bold">{formatMoney(auction.capPrice)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {isAuctionLive ? 'Expires' : 'Expired'}
                      </p>
                      <p className="text-sm font-medium mt-1.5">
                        {formatDateTime(auction.expiresAt)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                    <Gavel className="h-4 w-4 mr-2" />
                    Auctions are created automatically when a load is posted.
                  </div>
                )}
              </DynamicCard>
            </Col>
          </Row>
        </Col>
        <Col size={7}>
          <DynamicCard title="Route Map" expand>
            <DriverMap routes={routes} selectedRouteId={load._id} height="460px" />
          </DynamicCard>
        </Col>
      </Row>
    </PageShell>
  )
}
