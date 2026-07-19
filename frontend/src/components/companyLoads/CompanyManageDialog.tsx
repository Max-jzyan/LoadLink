import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import type { LoadWithDetails } from '@/services/companyApi/companyTypes'
import type { DriverSummary } from '@/services/loadApi/loadEnum'
import { RoutePath } from '@/config/routes'
import { LOAD_STATUSES } from '@/types/enums'
import { Settings2, Eye, Pencil, User, MapPinned } from 'lucide-react'

const NON_EDITABLE_STATUSES = [
  LOAD_STATUSES.InTransit,
  LOAD_STATUSES.Booked,
  LOAD_STATUSES.Completed,
  LOAD_STATUSES.Cancelled,
] as const

// Driver is assigned (and worth linking to) once a bid's been accepted.
const DRIVER_VISIBLE_STATUSES = [
  LOAD_STATUSES.Booked,
  LOAD_STATUSES.InTransit,
  LOAD_STATUSES.Completed,
] as const

function assignedDriver(load: LoadWithDetails): DriverSummary | null {
  const driver = load.assignedDriverId
  return typeof driver === 'object' && driver !== null ? driver : null
}

/**
 * The company's single action surface for a load: view/edit the posting,
 * jump to the assigned driver's profile, or track it on the map. The row's
 * "see more" drawer is reserved for read-only load info.
 */
export function CompanyManageDialog({ load }: { load: LoadWithDetails }) {
  const [open, setOpen] = useState(false)
  const canEdit = !(NON_EDITABLE_STATUSES as readonly string[]).includes(load.status)
  const driver =
    (DRIVER_VISIBLE_STATUSES as readonly string[]).includes(load.status) && assignedDriver(load)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5"
          onClick={(e) => e.stopPropagation()}
        >
          <Settings2 className="h-4 w-4" />
          Manage
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" onClick={(e) => e.stopPropagation()}>
        <DialogHeader className="gap-1">
          <DialogTitle>Manage Load — {load.commodity}</DialogTitle>
          <DialogDescription>
            View or edit this load, jump to the driver, or track it on the map.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-6">Load</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="gap-1.5" asChild>
                <Link
                  to={`/loads/${load._id}`}
                  state={{ from: RoutePath.CompanyDashboard }}
                  onClick={() => setOpen(false)}
                >
                  <Eye className="h-4 w-4" />
                  View
                </Link>
              </Button>
              {canEdit && (
                <Button variant="outline" size="sm" className="gap-1.5" asChild>
                  <Link
                    to={`/loads/${load._id}/edit`}
                    state={{ from: RoutePath.CompanyDashboard }}
                    onClick={() => setOpen(false)}
                  >
                    <Pencil className="h-4 w-4" />
                    Edit
                  </Link>
                </Button>
              )}
            </div>
          </div>

          {driver && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-6">Driver</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" className="gap-1.5" asChild>
                  <Link to={`/driver/${driver._id}`} onClick={() => setOpen(false)}>
                    <User className="h-4 w-4" />
                    {driver.name || `#${driver._id.slice(-6).toUpperCase()}`}
                  </Link>
                </Button>
              </div>
            </div>
          )}

          {load.status === LOAD_STATUSES.InTransit && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-6">Tracking</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" className="gap-1.5" asChild>
                  <Link to={`${RoutePath.Map}?loadId=${load._id}`} onClick={() => setOpen(false)}>
                    <MapPinned className="h-4 w-4" />
                    Track
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
