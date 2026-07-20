import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CheckpointConfirmDialog } from '@/components/map/CheckpointConfirmDialog'
import { type Checkpoint, generateCheckpoints } from '@/lib/checkpoints'
import { useReverseGeocodeQuery } from '@/services/locationSlices/geocoding'

interface CheckpointCheckInProps {
  loadId: string
  /** Road-following [lat, lng] path for this load's route, e.g. from resolveRoutePath(). */
  path: [number, number][]
}

interface PendingCheckpoint {
  checkpoint: Checkpoint
  displayLabel: string
}

/**
 * Lets a driver check in at one of several checkpoints spaced evenly along
 * the load's actual route, in addition to the on-demand geolocation-based
 * CheckInDialog. Selecting a checkpoint opens CheckpointConfirmDialog, which
 * verifies the driver's real location before submitting.
 */
export function CheckpointCheckIn({ loadId, path }: CheckpointCheckInProps) {
  const [pending, setPending] = useState<PendingCheckpoint | null>(null)
  const checkpoints = generateCheckpoints(path)

  if (checkpoints.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-md border p-2">
      <span className="text-[11px] font-medium text-muted-foreground mr-1">
        Check in at a checkpoint
      </span>
      {checkpoints.map((cp) => (
        <CheckpointButton
          key={cp.label}
          checkpoint={cp}
          onSelect={(checkpoint, displayLabel) => setPending({ checkpoint, displayLabel })}
        />
      ))}
      <CheckpointConfirmDialog
        loadId={loadId}
        pending={pending}
        onOpenChange={(open) => !open && setPending(null)}
      />
    </div>
  )
}

interface CheckpointButtonProps {
  checkpoint: Checkpoint
  onSelect: (checkpoint: Checkpoint, displayLabel: string) => void
}

/**
 * Resolves the checkpoint's coordinates to a "City, Province" label via
 * reverse geocoding. Shows a spinner while resolving rather than flashing
 * the distance-based fallback label (e.g. "Checkpoint 2 (~324 km)") first —
 * that fallback is only used if the lookup fails outright.
 */
function CheckpointButton({ checkpoint, onSelect }: CheckpointButtonProps) {
  const { data, isLoading, isError } = useReverseGeocodeQuery({
    lat: checkpoint.lat,
    lng: checkpoint.lng,
  })
  const displayLabel = data?.label ?? (isError ? checkpoint.label : null)

  return (
    <Button
      variant="outline"
      size="sm"
      className="h-6 px-2 text-[11px]"
      disabled={isLoading}
      onClick={() => displayLabel && onSelect(checkpoint, displayLabel)}
    >
      {displayLabel ?? <Loader2 className="h-3 w-3 animate-spin" />}
    </Button>
  )
}
