import { useEffect, useRef } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useCurrentLocation } from '@/hooks/useCurrentLocation'
import { haversineDistanceKm } from '@/lib/geo'
import { fuzzLocation } from '@/lib/geoFuzz'
import { showError, showSuccess } from '@/lib/toast'
import type { Checkpoint } from '@/lib/checkpoints'
import { useCheckInMutation } from '@/services/loadApi/loadSlice'

const NEARBY_THRESHOLD_KM = 10

interface CheckpointConfirmDialogProps {
  loadId: string
  pending: { checkpoint: Checkpoint; displayLabel: string } | null
  onOpenChange: (open: boolean) => void
}

/**
 * Confirms a checkpoint check-in after cross-checking the driver's real
 * browser geolocation against the checkpoint's coordinates. Still lets the
 * driver confirm if they're far away or if location can't be determined —
 * this is a heads-up, not a hard block — but always submits the checkpoint's
 * own (fuzzed) coordinates, same as before this dialog existed.
 */
export function CheckpointConfirmDialog({
  loadId,
  pending,
  onOpenChange,
}: CheckpointConfirmDialogProps) {
  const {
    location,
    status: locationStatus,
    error: locationError,
    requestLocation,
  } = useCurrentLocation()
  const [checkIn, { isLoading: isSubmitting, isError: isSubmitError, reset }] = useCheckInMutation()
  // Guards against StrictMode double-firing requestLocation() for the same
  // checkpoint, and re-requests fresh location each time a new checkpoint is
  // selected (same convention as the fetchingRef guards in pages/Map.tsx).
  const requestedKeyRef = useRef<string | null>(null)

  useEffect(() => {
    if (!pending) {
      requestedKeyRef.current = null
      return
    }
    const key = `${pending.checkpoint.lat},${pending.checkpoint.lng}`
    if (requestedKeyRef.current === key) return
    requestedKeyRef.current = key
    reset()
    requestLocation()
  }, [pending, requestLocation, reset])

  if (!pending) return null

  const { checkpoint, displayLabel } = pending

  const distanceKm = location
    ? haversineDistanceKm(location.lat, location.lng, checkpoint.lat, checkpoint.lng)
    : null
  const isFar = distanceKm !== null && distanceKm > NEARBY_THRESHOLD_KM

  const handleConfirm = async () => {
    const result = await checkIn({ loadId, body: fuzzLocation(checkpoint.lat, checkpoint.lng) })
    if ('error' in result) {
      showError(`Could not check in at ${displayLabel}.`)
    } else {
      showSuccess(`Checked in at ${displayLabel}.`)
      onOpenChange(false)
    }
  }

  const confirmDisabled = locationStatus === 'locating' || locationStatus === 'idle' || isSubmitting

  return (
    <Dialog open={!!pending} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Check in at {displayLabel}?</DialogTitle>
          <DialogDescription>
            We'll check your current location against this checkpoint before checking in.
          </DialogDescription>
        </DialogHeader>

        {(locationStatus === 'locating' || locationStatus === 'idle') && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Getting your current location…
          </p>
        )}

        {locationStatus === 'error' && locationError && (
          <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-700 dark:text-amber-400">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>We couldn't verify your location ({locationError}). You can still check in.</span>
          </div>
        )}

        {distanceKm !== null && !isFar && (
          <p className="text-sm text-muted-foreground">
            You're about {distanceKm} km from {displayLabel}.
          </p>
        )}

        {isFar && (
          <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-700 dark:text-amber-400">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              You're about {distanceKm} km from {displayLabel} — that's more than{' '}
              {NEARBY_THRESHOLD_KM} km away. You can still check in if this is correct.
            </span>
          </div>
        )}

        {isSubmitError && (
          <p className="text-sm text-destructive">Could not check in. Please try again.</p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={confirmDisabled}>
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSubmitting ? 'Checking in…' : 'Confirm Check In'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
