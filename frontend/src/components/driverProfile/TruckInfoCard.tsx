import DynamicCard from '@/components/layout/DynamicCard'
import { Button } from '@/components/ui/button'
import type { DriverProfile, Truck as DriverTruck } from '@/services/driverApi/driverEnum'
import { CheckCircle, Plus, Truck as TruckIcon } from 'lucide-react'

import EditPencilButton from '@/components/shared/EditPencilButton'

interface TruckInfoCardProps {
  driver: DriverProfile
  onAddTruck: () => void
  onEditTruck: (truck: DriverTruck) => void
}

export default function TruckInfoCard({ driver, onAddTruck, onEditTruck }: TruckInfoCardProps) {
  const primaryTruck = driver.trucks.find((t) => t.isPrimary)
  const otherTrucks = driver.trucks.filter((t) => !t.isPrimary)

  return (
    <DynamicCard
      title="Trucks"
      action={
        <Button variant="outline" size="sm" onClick={onAddTruck}>
          <Plus className="mr-1 h-4 w-4" />
          Add New Truck
        </Button>
      }
    >
      {driver.trucks.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">No trucks registered yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
          {/* Primary Truck */}
          {primaryTruck && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold text-primary uppercase tracking-wide">
                    Primary Truck
                  </span>
                </div>
                <EditPencilButton
                  onClick={() => onEditTruck(primaryTruck)}
                  ariaLabel="Edit truck"
                  title="Edit truck"
                />
              </div>
              <TruckDetail truck={primaryTruck} />
            </div>
          )}

          {/* Other Trucks */}
          {otherTrucks.map((truck) => (
            <div key={truck._id} className="rounded-lg border p-4">
              <div className="flex items-center justify-between mb-1">
                <div />
                <EditPencilButton
                  onClick={() => onEditTruck(truck)}
                  ariaLabel="Edit truck"
                  title="Edit truck"
                />
              </div>
              <TruckDetail truck={truck} />
            </div>
          ))}
        </div>
      )}
    </DynamicCard>
  )
}

function TruckDetail({ truck }: { truck: DriverTruck }) {
  return (
    <div className="space-y-1 text-sm">
      <div className="flex items-center gap-2">
        <TruckIcon className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="font-medium truncate">
          {truck.year} {truck.make} {truck.model}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
        <span>Type: {truck.truckType}</span>
        <span>Trailer: {truck.trailerLengthFt}ft</span>
        <span>Capacity: {(truck.capacityLbs / 1000).toFixed(0)}k lbs</span>
        <span>Plate: {truck.plateNumber}</span>
      </div>
    </div>
  )
}
