import { LoadForm, type LoadFormValues } from '@/components/LoadForm'
import PageShell from '@/components/layout/PageShell'
import { Button } from '@/components/ui/button'
import { RoutePath } from '@/config/routes'
import { useGetLoadQuery, useUpdateLoadMutation } from '@/services/loadApi/loadSlice'
import { LOAD_STATUSES } from '@/types/enums'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

const NON_EDITABLE_STATUSES: readonly string[] = [
  LOAD_STATUSES.InTransit,
  LOAD_STATUSES.Booked,
  LOAD_STATUSES.Completed,
  LOAD_STATUSES.Cancelled,
]

export default function LoadEdit() {
  const { loadId } = useParams<{ loadId: string }>()
  const navigate = useNavigate()
  const { data: load, isLoading, isError } = useGetLoadQuery(loadId ?? '', { skip: !loadId })
  const [updateLoad, { isLoading: isSaving }] = useUpdateLoadMutation()

  const canEdit = load ? !NON_EDITABLE_STATUSES.includes(load.status) : false

  // Map the fetched load (+ its auction) back into LoadForm's initial values
  const initialValues = useMemo<Partial<LoadFormValues> | undefined>(() => {
    if (!load) return undefined
    const auction = load.auctionId ?? null
    return {
      originAddress: load.originAddress,
      destinationAddress: load.destinationAddress,
      originCoords: load.originCoords,
      destinationCoords: load.destinationCoords,
      pickupTime: load.pickupTime,
      dropoffTime: load.dropoffTime,
      weightLbs: load.weightLbs,
      commodity: load.commodity,
      truckType: load.truckType,
      trailerLengthFt: load.trailerLengthFt,
      certifications: load.certifications,
      driverAssist: load.driverAssist,
      startPrice: auction?.startPrice,
      capPrice: auction?.capPrice,
      priceCreepAmount: auction?.priceCreepAmount,
      priceCreepIntervalHours: auction?.priceCreepIntervalHours,
      autoAcceptPercent: auction?.autoAcceptPercent,
      autoAcceptTriggerHours: auction?.autoAcceptTriggerHours,
      expiresAt: auction?.expiresAt,
    }
  }, [load])

  const handleSubmit = async (values: LoadFormValues) => {
    if (!loadId) return
    try {
      await updateLoad({ loadId, body: values }).unwrap()
      navigate(`/loads/${loadId}`)
    } catch {
      // error toast handled by the mutation
    }
  }

  if (isLoading) {
    return (
      <PageShell title="Edit Load">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PageShell>
    )
  }

  if (isError || !load) {
    return (
      <PageShell title="Edit Load">
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

  if (!canEdit) {
    return (
      <PageShell title="Edit Load">
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <p className="text-sm text-muted-foreground max-w-md">
            This load can no longer be edited — it has been booked, is in transit, or is already
            completed. You can still view its details.
          </p>
          <Button variant="outline" asChild>
            <Link to={`/loads/${load._id}`}>
              <ArrowLeft className="h-4 w-4" />
              View Load Details
            </Link>
          </Button>
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell
      title="Edit Load"
      subtitle={`Load #${load._id.slice(-6).toUpperCase()}`}
      actions={
        <Button variant="outline" size="sm" asChild>
          <Link to={`/loads/${load._id}`}>
            <ArrowLeft className="h-4 w-4" />
            Cancel
          </Link>
        </Button>
      }
    >
      <LoadForm initialValues={initialValues} onSubmit={handleSubmit} isSubmitting={isSaving} />
    </PageShell>
  )
}
