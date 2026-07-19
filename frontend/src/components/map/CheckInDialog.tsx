import { useEffect, useRef, useState } from 'react'
import { Loader2, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useCurrentLocation } from '@/hooks/useCurrentLocation'
import { fuzzLocation } from '@/lib/geoFuzz'
import { useCheckInMutation } from '@/services/loadApi/loadSlice'

interface CheckInDialogProps {
  loadId: string
}

/** Lets the assigned driver ping their approximate location to the company for an in-transit load. */
export function CheckInDialog({ loadId }: CheckInDialogProps) {
  const [open, setOpen] = useState(false)
  const {
    location,
    status: locationStatus,
    error: locationError,
    requestLocation,
  } = useCurrentLocation()
  const [checkIn, { isLoading: isSubmitting, isError: isSubmitError, reset }] = useCheckInMutation()
  // useCurrentLocation's state outlives a single dialog open/close (only
  // DialogContent unmounts, not this component) — without this flag, a
  // stale 'success' status from a previous check-in would auto-resubmit
  // the instant the dialog reopens.
  const awaitingLocationRef = useRef(false)

  const onOpenChange = (next: boolean) => {
    setOpen(next)
    if (next) {
      reset()
      awaitingLocationRef.current = false
    }
  }

  const handleConfirm = () => {
    awaitingLocationRef.current = true
    requestLocation()
  }

  useEffect(() => {
    if (!open || !awaitingLocationRef.current) return
    if (locationStatus !== 'success' || !location) return
    awaitingLocationRef.current = false
    const fuzzed = fuzzLocation(location.lat, location.lng)
    checkIn({ loadId, body: fuzzed }).then((result) => {
      if (!('error' in result)) setOpen(false)
    })
  }, [open, location, locationStatus, loadId, checkIn])

  const isBusy = locationStatus === 'locating' || isSubmitting

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <MapPin className="h-4 w-4" />
          Check In
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Check in with your location?</DialogTitle>
          <DialogDescription>
            This pings your approximate location to the company — your position is fuzzed before it
            ever leaves your browser, so your exact location is never sent or stored.
          </DialogDescription>
        </DialogHeader>

        {locationStatus === 'error' && locationError && (
          <p className="text-sm text-destructive">{locationError}</p>
        )}
        {isSubmitError && (
          <p className="text-sm text-destructive">Could not check in. Please try again.</p>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={isBusy}>
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={handleConfirm} disabled={isBusy}>
            {isBusy && <Loader2 className="h-4 w-4 animate-spin" />}
            {isBusy ? 'Checking in…' : 'Confirm Check In'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
