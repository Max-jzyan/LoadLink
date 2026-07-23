import { DriverMap } from '@/components/driverLoads/Map'
import MessageButton from '@/components/messages/MessageButton'
import Col from '@/components/layout/Col'
import DynamicCard from '@/components/layout/DynamicCard'
import PageShell from '@/components/layout/PageShell'
import Row from '@/components/layout/Row'
import { StatusBadge } from '@/components/shared/StatusBadge'
import Spinner from '@/components/shared/Spinner'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RoutePath } from '@/config/routes'
import { formatMoney } from '@/lib/format'
import { fetchRoadPositions } from '@/lib/routing'
import useAuth from '@/hooks/useAuth'
import {
  useGetLoadQuery,
  useGetAcceptedBidQuery,
  useGetBolQuery,
  useSubmitSignedBolMutation,
} from '@/services/loadApi/loadSlice'
import { useStreamNotificationsQuery } from '@/services/notificationApi/notificationSlice'
import { NOTIFICATION_TYPES } from '@/services/notificationApi/notificationEnum'
import { LOAD_STATUSES } from '@/types/enums'
import { uploadDocuments } from '@/lib/uploadDocuments'
import { auth } from '@/lib/firebase'
import {
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Gavel,
  MapPin,
  Package2,
  Pencil,
  Truck,
  Upload,
  Weight,
} from 'lucide-react'
import { useMemo, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { setBreadcrumbLabel } from '@/services/breadcrumbSlice'

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
  const location = useLocation()
  const backTarget =
    (location.state as { from?: RoutePath } | null)?.from ?? RoutePath.CompanyAuctions
  const {
    data: load,
    isLoading: loadLoading,
    isError: loadError,
    refetch: refetchLoad,
  } = useGetLoadQuery(loadId ?? '', { skip: !loadId })
  const { user } = useAuth()
  const isBooked =
    load?.status === LOAD_STATUSES.Booked ||
    load?.status === LOAD_STATUSES.InTransit ||
    load?.status === LOAD_STATUSES.Completed
  const isCompleted = load?.status === LOAD_STATUSES.Completed
  const showDocuments = isBooked && !!loadId

  // Rate confirmation (company / admin view)
  const showRc = (user?.role === 'company' || user?.role === 'admin') && isBooked
  const { data: acceptedBid, isLoading: acceptedBidLoading } = useGetAcceptedBidQuery(
    loadId ?? '',
    {
      skip: !loadId || !showRc,
    }
  )

  // Bill of Lading (both driver and company see it once booked)
  const {
    data: bolData,
    isLoading: bolLoading,
    refetch: refetchBol,
  } = useGetBolQuery(loadId ?? '', { skip: !showDocuments })

  // Signed BOL submission (driver only)
  const [submitSignedBol, { isLoading: submittingSignedBol }] = useSubmitSignedBolMutation()
  const signedBolInputRef = useRef<HTMLInputElement>(null)
  const [signedBolError, setSignedBolError] = useState<string | null>(null)

  const handleSignedBolUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !loadId) return
    setSignedBolError(null)
    try {
      const idToken = await auth.currentUser?.getIdToken()
      const firebaseUid = user?.uid
      if (!idToken || !firebaseUid) throw new Error('Not authenticated')
      const [uploaded] = await uploadDocuments(
        idToken,
        firebaseUid,
        'loadDocuments',
        [file],
        loadId
      )
      await submitSignedBol({ loadId, s3Key: uploaded.key }).unwrap()
      refetchBol()
    } catch {
      setSignedBolError('Upload failed. Please try again.')
    } finally {
      // Reset input so the same file can be re-selected after an error
      if (signedBolInputRef.current) signedBolInputRef.current.value = ''
    }
  }
  const dispatch = useDispatch()

  // Push a friendly origin → destination label into the breadcrumb store for
  // both the detail route and its /edit sub-route (no extra fetch needed — we
  // already have the load). PageLayout reads it instead of parsing the URL.
  useEffect(() => {
    if (loadId && load) {
      const label = `${load.originAddress.split(',')[0].trim()} → ${load.destinationAddress
        .split(',')[0]
        .trim()}`
      dispatch(
        setBreadcrumbLabel({
          path: `/loads/${loadId}`,
          label,
        })
      )
    }
  }, [loadId, load, dispatch])

  // Reuses the same notification SSE stream NotificationBell already
  // subscribes to (RTK Query dedupes by query args, so this doesn't open a
  // second EventSource). When a check-in notification for this exact load
  // comes in, refetch so an already-open detail page picks up the new
  // check-in marker without a manual reload.
  const { data: streamData } = useStreamNotificationsQuery(undefined)

  useEffect(() => {
    if (!streamData || !loadId) return
    if (!('_id' in streamData) || !('type' in streamData)) return
    if (streamData.type !== NOTIFICATION_TYPES.DRIVER_CHECKED_IN) return
    if (streamData.data?.loadId !== loadId) return
    refetchLoad()
  }, [streamData, loadId, refetchLoad])

  const auction = load?.auctionId ?? null
  const canEdit = load ? !NON_EDITABLE_STATUSES.includes(load.status) : false
  const isAuctionLive = load?.status === LOAD_STATUSES.AuctionLive

  // Road [lat, lng][] positions fetched from Geoapify when the load has no stored polyline
  const [roadPositions, setRoadPositions] = useState<[number, number][] | null>(null)
  // Track the load ID we've already started fetching so StrictMode doublefire doesn't duplicate requests
  const fetchingRef = useRef<string | null>(null)

  useEffect(() => {
    if (!load || load.route?.polyline) return
    if (fetchingRef.current === load._id) return
    fetchingRef.current = load._id

    fetchRoadPositions(load.originCoords, load.destinationCoords).then(setRoadPositions)
  }, [load])

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
        positions: roadPositions ?? undefined,
      },
    ]
  }, [load, roadPositions])

  const checkIn = load?.lastCheckIn
    ? {
        position: [load.lastCheckIn.coords.lat, load.lastCheckIn.coords.lng] as [number, number],
        checkedInAt: load.lastCheckIn.checkedInAt,
      }
    : null

  if (loadLoading || loadError || !load) {
    return (
      <PageShell title="Load Details">
        <div className="flex items-center justify-center py-20">
          <Spinner />
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
          {canEdit && (
            <Button variant="outline" size="sm" asChild>
              <Link to={`/loads/${load._id}/edit`} state={{ from: backTarget, viaDetail: true }}>
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
          {user?.role === 'company' && load.assignedDriverId && (
            <MessageButton loadId={load._id} label="Message Driver" />
          )}
        </>
      }
    >
      <Row stackAt="lg">
        <Col size={9}>
          {/* ── Documents ─────────────────────────────────────────────────── */}
          {showDocuments && (
            <DynamicCard
              title="Documents"
              className="mb-4"
              description="All freight documents for this load."
            >
              {bolLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : (
                <div className="divide-y">
                  {/* Rate Confirmation — company / admin only */}
                  {showRc && (
                    <div className="flex items-center justify-between py-3 gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div>
                          <p className="text-sm font-medium">Rate Confirmation</p>
                          <p className="text-xs text-muted-foreground">
                            Signed automatically by dispatch at booking
                          </p>
                        </div>
                      </div>
                      {acceptedBid?.rateConfirmationUrl ? (
                        <Button size="sm" variant="outline" asChild>
                          <a
                            href={acceptedBid.rateConfirmationUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Download className="h-3.5 w-3.5" />
                            Download
                          </a>
                        </Button>
                      ) : (
                        <Badge variant="secondary">Generating…</Badge>
                      )}
                    </div>
                  )}

                  {/* Bill of Lading (blank) — driver + company */}
                  <div className="flex items-center justify-between py-3 gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-sm font-medium">Bill of Lading</p>
                        <p className="text-xs text-muted-foreground">
                          {user?.role === 'driver'
                            ? 'Print and bring to pickup — shipper signs at origin, consignee signs at delivery'
                            : 'Carrier takes this to pickup for signatures'}
                        </p>
                      </div>
                    </div>
                    {bolData?.bolUrl ? (
                      <Button size="sm" variant="outline" asChild>
                        <a href={bolData.bolUrl} target="_blank" rel="noopener noreferrer">
                          <Download className="h-3.5 w-3.5" />
                          Download
                        </a>
                      </Button>
                    ) : (
                      <Badge variant="secondary">Generating…</Badge>
                    )}
                  </div>

                  {/* Signed BOL — driver submits after delivery; company reviews */}
                  <div className="flex items-center justify-between py-3 gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-sm font-medium">Signed Bill of Lading</p>
                        <p className="text-xs text-muted-foreground">
                          {bolData?.signedBolUrl
                            ? user?.role === 'company' || user?.role === 'admin'
                              ? 'Driver submitted the signed copy — please review and retain'
                              : 'Submitted — awaiting company review'
                            : user?.role === 'driver'
                              ? isCompleted
                                ? 'Upload the signed copy you received at delivery'
                                : 'Available after completing delivery'
                              : 'Awaiting driver submission after delivery'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {bolData?.signedBolUrl ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <Button size="sm" variant="outline" asChild>
                            <a
                              href={bolData.signedBolUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Download className="h-3.5 w-3.5" />
                              {user?.role === 'company' || user?.role === 'admin'
                                ? 'Review'
                                : 'View'}
                            </a>
                          </Button>
                        </>
                      ) : user?.role === 'driver' && isCompleted ? (
                        <>
                          <input
                            ref={signedBolInputRef}
                            type="file"
                            accept=".pdf,image/*"
                            className="hidden"
                            onChange={handleSignedBolUpload}
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={submittingSignedBol}
                            onClick={() => signedBolInputRef.current?.click()}
                          >
                            {submittingSignedBol ? (
                              <Spinner className="h-3.5 w-3.5" />
                            ) : (
                              <Upload className="h-3.5 w-3.5" />
                            )}
                            {submittingSignedBol ? 'Uploading…' : 'Submit Signed BOL'}
                          </Button>
                          {signedBolError && (
                            <p className="text-xs text-destructive">{signedBolError}</p>
                          )}
                        </>
                      ) : (
                        <Badge variant="outline" className="gap-1 text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          Pending
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </DynamicCard>
          )}

          <DynamicCard title="Load Information" action={<StatusBadge status={load.status} />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              <DetailField icon={MapPin} label="Origin" value={load.originAddress} />
              <DetailField icon={MapPin} label="Destination" value={load.destinationAddress} />
              <DetailField icon={Calendar} label="Pickup" value={formatDateTime(load.pickupTime)} />
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
          <DynamicCard
            className="mt-4"
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
                  <p className="text-sm font-medium mt-1.5">{formatDateTime(auction.expiresAt)}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                <Gavel className="h-4 w-4 mr-2" />
                Auctions are created automatically when a load is posted.
              </div>
            )}
          </DynamicCard>
          {showRc && (
            <DynamicCard
              className="mt-4"
              title="Accepted Bid"
              description={
                acceptedBid?.acceptedAt
                  ? `Accepted ${formatDateTime(acceptedBid.acceptedAt)}`
                  : undefined
              }
            >
              {acceptedBidLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-6 w-[200px]" />
                  <Skeleton className="h-4 w-[150px]" />
                </div>
              ) : acceptedBid ? (
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Accepted Amount</p>
                    <p className="text-2xl font-bold">{formatMoney(acceptedBid.amount)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" asChild>
                      <Link to={`/driver/${acceptedBid.driverId}`}>View Driver</Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No accepted bid yet.</p>
              )}
            </DynamicCard>
          )}
        </Col>
        <Col size={7}>
          <DynamicCard title="Route Map" expand>
            <DriverMap
              routes={routes}
              selectedRouteId={load._id}
              height="460px"
              checkIn={checkIn}
            />
          </DynamicCard>
        </Col>
      </Row>
    </PageShell>
  )
}
