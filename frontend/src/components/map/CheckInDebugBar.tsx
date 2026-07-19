import { Button } from '@/components/ui/button'
import { fuzzLocation } from '@/lib/geoFuzz'
import { showError, showSuccess } from '@/lib/toast'
import { useCheckInMutation } from '@/services/loadApi/loadSlice'

const VANCOUVER_CALGARY_WAYPOINTS = [
  { label: 'Hope, BC', lat: 49.3858, lng: -121.4413 },
  { label: 'Kamloops, BC', lat: 50.6745, lng: -120.3273 },
  { label: 'Revelstoke, BC', lat: 50.9981, lng: -118.1957 },
  { label: 'Golden, BC', lat: 51.2965, lng: -116.9614 },
  { label: 'Banff, AB', lat: 51.1784, lng: -115.5708 },
] as const

interface CheckInDebugBarProps {
  loadId: string
}

/**
 * Dev-only: spoofs a check-in at fixed waypoints along the Vancouver→Calgary
 * highway route, so the marker/notification pipeline can be exercised
 * repeatedly without relying on real browser geolocation. Runs the same
 * fuzz → mutation → invalidation path as a real check-in.
 */
export function CheckInDebugBar({ loadId }: CheckInDebugBarProps) {
  const [checkIn, { isLoading }] = useCheckInMutation()

  const handleClick = async (wp: (typeof VANCOUVER_CALGARY_WAYPOINTS)[number]) => {
    const result = await checkIn({ loadId, body: fuzzLocation(wp.lat, wp.lng) })
    if ('error' in result) {
      showError(`Could not spoof check-in at ${wp.label}.`)
    } else {
      showSuccess(`Spoofed check-in at ${wp.label}.`)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-dashed p-2">
      <span className="text-[11px] font-medium text-muted-foreground mr-1">
        Debug: spoof check-in
      </span>
      {VANCOUVER_CALGARY_WAYPOINTS.map((wp) => (
        <Button
          key={wp.label}
          variant="outline"
          size="sm"
          className="h-6 px-2 text-[11px]"
          disabled={isLoading}
          onClick={() => handleClick(wp)}
        >
          {wp.label}
        </Button>
      ))}
    </div>
  )
}
