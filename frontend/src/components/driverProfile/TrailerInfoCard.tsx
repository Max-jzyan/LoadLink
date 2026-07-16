import DynamicCard from '@/components/layout/DynamicCard'
import { Button } from '@/components/ui/button'
import type { Trailer } from '@/services/driverApi/driverEnum'
import { CheckCircle, Plus, Truck } from 'lucide-react'
import EditPencilButton from '@/components/shared/EditPencilButton'

interface TrailerInfoCardProps {
  trailers: Trailer[]
  onAddTrailer: () => void
  onEditTrailer: (trailer: Trailer) => void
}

export default function TrailerInfoCard({
  trailers,
  onAddTrailer,
  onEditTrailer,
}: TrailerInfoCardProps) {
  const primaryTrailer = trailers.find((t) => t.isPrimary)
  const otherTrailers = trailers.filter((t) => !t.isPrimary)

  return (
    <DynamicCard
      title="Trailers"
      action={
        <Button variant="outline" size="sm" onClick={onAddTrailer}>
          <Plus className="mr-1 h-4 w-4" />
          Add Trailer
        </Button>
      }
    >
      {trailers.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">No trailers registered yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
          {/* Primary Trailer */}
          {primaryTrailer && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold text-primary uppercase tracking-wide">
                    Primary Trailer
                  </span>
                </div>
                <EditPencilButton
                  onClick={() => onEditTrailer(primaryTrailer)}
                  ariaLabel="Edit trailer"
                  title="Edit trailer"
                />
              </div>
              <TrailerDetail trailer={primaryTrailer} />
            </div>
          )}

          {/* Other Trailers */}
          {otherTrailers.map((trailer) => (
            <div key={trailer._id} className="rounded-lg border p-4">
              <div className="flex items-center justify-between mb-1">
                <div />
                <EditPencilButton
                  onClick={() => onEditTrailer(trailer)}
                  ariaLabel="Edit trailer"
                  title="Edit trailer"
                />
              </div>
              <TrailerDetail trailer={trailer} />
            </div>
          ))}
        </div>
      )}
    </DynamicCard>
  )
}

function TrailerDetail({ trailer }: { trailer: Trailer }) {
  return (
    <div className="space-y-1 text-sm">
      <div className="flex items-center gap-2">
        <Truck className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="font-medium truncate">
          {trailer.make
            ? `${trailer.year ? trailer.year + ' ' : ''}${trailer.make}`
            : `${trailer.trailerType} Trailer`}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
        <span>Type: {trailer.trailerType}</span>
        <span>Length: {trailer.lengthFt}ft</span>
        {trailer.unitNumber && <span>Unit #: {trailer.unitNumber}</span>}
        <span>Plate: {trailer.plateNumber}</span>
        {trailer.capacityLbs > 0 && (
          <span>Capacity: {(trailer.capacityLbs / 1000).toFixed(0)}k lbs</span>
        )}
      </div>
    </div>
  )
}
