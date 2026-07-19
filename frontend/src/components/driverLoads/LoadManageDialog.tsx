import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useUpdateLoadStatusMutation } from '@/services/loadApi/loadSlice'
import { useSelectTruckForLoadMutation } from '@/services/driverApi/driverSlice'
import { LOAD_STATUSES, type LoadStatus } from '@/types/enums'
import type { Load, CompanySummary } from '@/services/loadApi/loadEnum'
import type { Truck } from '@/services/driverApi/driverEnum'
import { RoutePath } from '@/config/routes'
import { updateLoadInList } from '@/services/driverLoadsSlice'
import { selectMongoId } from '@/services/authSlice'
import type { AppDispatch } from '@/services/store'
import { Settings2, Truck as TruckIcon, CircleCheck, RotateCcw, XCircle, Bell } from 'lucide-react'
import CompanyNameLink from '@/components/shared/CompanyNameLink'

export function truckDisplayName(t: Truck) {
  return `${t.year} ${t.make} ${t.model} (${t.trailerLengthFt}ft)`
}

function populatedCompany(load: Load): CompanySummary | null {
  const company = load.companyId
  return typeof company === 'object' && company !== null ? company : null
}

interface StatusAction {
  label: string
  status: string
  icon: React.ReactNode
  variant?: 'default' | 'destructive' | 'outline' | 'ghost'
  className?: string
}

function possibleActions(load: Load): StatusAction[] {
  if (load.status === LOAD_STATUSES.Booked) {
    return [
      {
        label: 'In Transit',
        status: LOAD_STATUSES.InTransit,
        icon: <TruckIcon className="h-4 w-4" />,
      },
      {
        label: 'Cancel',
        status: LOAD_STATUSES.Cancelled,
        icon: <XCircle className="h-4 w-4" />,
        variant: 'destructive',
      },
    ]
  }
  if (load.status === LOAD_STATUSES.InTransit) {
    return [
      {
        label: 'Completed',
        status: LOAD_STATUSES.Completed,
        icon: <CircleCheck className="h-4 w-4 text-green-600" />,
        variant: 'outline',
        className: 'text-green-600 border-green-300 hover:bg-green-50',
      },
      {
        label: 'Back to Booked',
        status: LOAD_STATUSES.Booked,
        icon: <RotateCcw className="h-4 w-4" />,
        variant: 'outline',
      },
      {
        label: 'Cancel',
        status: LOAD_STATUSES.Cancelled,
        icon: <XCircle className="h-4 w-4" />,
        variant: 'destructive',
      },
    ]
  }
  if (load.status === LOAD_STATUSES.Completed) {
    return [
      {
        label: 'Back to In Transit',
        status: LOAD_STATUSES.InTransit,
        icon: <RotateCcw className="h-4 w-4" />,
        variant: 'outline',
      },
    ]
  }
  if (load.status === LOAD_STATUSES.Cancelled) {
    return [
      {
        label: 'Back to Booked',
        status: LOAD_STATUSES.Booked,
        icon: <RotateCcw className="h-4 w-4" />,
        variant: 'outline',
      },
    ]
  }
  return []
}

export function LoadManageDialog({ load, trucks = [] }: { load: Load; trucks?: Truck[] }) {
  const [open, setOpen] = useState(false)
  const dispatch = useDispatch<AppDispatch>()
  const driverId = useSelector(selectMongoId)
  const [updateLoadStatus] = useUpdateLoadStatusMutation()
  const [selectTruck] = useSelectTruckForLoadMutation()

  const handleStatusUpdate = useCallback(
    (newStatus: LoadStatus) => {
      if (!driverId) return
      dispatch(updateLoadInList({ loadId: load._id, changes: { status: newStatus } }))
      updateLoadStatus({ driverId, loadId: load._id, status: newStatus })
    },
    [load._id, driverId, dispatch, updateLoadStatus]
  )

  const handleSelectTruck = useCallback(
    (truckId: string | null) => {
      dispatch(updateLoadInList({ loadId: load._id, changes: { selectedTruckId: truckId } }))
      selectTruck({ loadId: load._id, truckId })
    },
    [load._id, dispatch, selectTruck]
  )

  const actions = possibleActions(load)
  const company = populatedCompany(load)

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
          <DialogTitle className="flex flex-wrap items-center gap-1">
            <span>Manage Load —</span>
            {company ? (
              <CompanyNameLink name={company.companyName ?? company.name} companyId={company._id} />
            ) : (
              <span>Unknown company</span>
            )}
            <span>· {load.commodity}</span>
          </DialogTitle>
          <DialogDescription>
            Assign a truck, update the load's status, or notify the company.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-col gap-2.5">
            <p className="text-xs font-medium text-muted-foreground">Assign Truck</p>
            {trucks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No trucks registered</p>
            ) : (
              <Select
                value={load.selectedTruckId ?? '__none__'}
                onValueChange={(val) => handleSelectTruck(val === '__none__' ? null : val)}
              >
                <SelectTrigger className="h-9 w-full text-sm">
                  <SelectValue placeholder="Select a truck..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {trucks.map((t) => (
                    <SelectItem key={t._id} value={t._id}>
                      {truckDisplayName(t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {actions.length > 0 && (
            <div className="mt-3 flex flex-col gap-2.5">
              <p className="text-xs font-medium text-muted-foreground">Manage Load Status</p>
              <div className="flex flex-wrap gap-2">
                {actions.map((action) => (
                  <Button
                    key={action.status}
                    variant={action.variant ?? 'outline'}
                    size="sm"
                    className={`gap-1.5 ${action.className ?? ''}`}
                    onClick={() => handleStatusUpdate(action.status as LoadStatus)}
                  >
                    {action.icon}
                    {action.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {load.status === LOAD_STATUSES.InTransit && (
            <div className="flex flex-col gap-2.5">
              <p className="text-xs font-medium text-muted-foreground">Notify Company</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" className="gap-1.5" asChild>
                  <Link to={`${RoutePath.Map}?loadId=${load._id}`} onClick={() => setOpen(false)}>
                    <Bell className="h-4 w-4" />
                    Go to Map &amp; Ping
                  </Link>
                </Button>
                {/* TODO(PR3): wire to the check-in mutation once it exists */}
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  disabled
                  title="Coming soon"
                >
                  <Bell className="h-4 w-4" />
                  Ping
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
