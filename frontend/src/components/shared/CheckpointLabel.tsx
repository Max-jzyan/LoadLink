import { useReverseGeocodeQuery } from '@/services/locationSlices/geocoding'
import type { Checkpoint } from '@/lib/checkpoints'

export function CheckpointLabel({ checkpoint }: { checkpoint: Checkpoint }) {
  const { data } = useReverseGeocodeQuery({ lat: checkpoint.lat, lng: checkpoint.lng })
  return <>{data?.label ?? checkpoint.label}</>
}
