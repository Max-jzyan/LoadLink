import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { useUpdateLoadMutation } from '@/services/loadApi/loadSlice'
import { useSelectTruckForLoadMutation } from '@/services/driverApi/driverSlice'
import { updateLoadInList } from '@/services/driverLoadsSlice'
import { LOAD_STATUSES, type LoadStatus } from '@/types/enums'
import type { Load } from '@/services/loadApi/loadEnum'
import type { Truck } from '@/services/driverApi/driverEnum'
import { Truck as TruckIcon, CircleCheck, RotateCcw, XCircle, Check } from 'lucide-react'
import { useCallback } from 'react'
import { useDispatch } from 'react-redux'
import type { AppDispatch } from '@/services/store'

interface StatusAction {
  label: string
  status: string
  icon: React.ReactNode
  variant?: 'default' | 'destructive' | 'outline' | 'ghost'
  title: string
  className?: string
}

function PossibleActions({
  load,
  onAction,
}: {
  load: Load
  onAction: (status: LoadStatus) => void
}) {
  const actions: StatusAction[] = []

  if (load.status === LOAD_STATUSES.Booked) {
    actions.push(
      {
        label: 'Cancel',
        status: LOAD_STATUSES.Cancelled,
        icon: <XCircle className="h-4 w-4" />,
        variant: 'destructive',
        title: 'Cancel Load',
      },
      {
        label: 'In Transit',
        status: LOAD_STATUSES.InTransit,
        icon: <TruckIcon className="h-4 w-4" />,
        title: 'Mark In Transit',
      }
    )
  } else if (load.status === LOAD_STATUSES.InTransit) {
    actions.push(
      {
        label: 'Cancel',
        status: LOAD_STATUSES.Cancelled,
        icon: <XCircle className="h-4 w-4" />,
        variant: 'destructive',
        title: 'Cancel Load',
      },
      {
        label: 'Back to Booked',
        status: LOAD_STATUSES.Booked,
        icon: <RotateCcw className="h-4 w-4" />,
        variant: 'outline',
        title: 'Revert to Booked',
      },
      {
        label: 'Completed',
        status: LOAD_STATUSES.Completed,
        icon: <CircleCheck className="h-4 w-4 text-green-600" />,
        variant: 'ghost',
        className: 'text-green-600 hover:text-green-700 hover:bg-green-50',
        title: 'Mark Completed',
      }
    )
  } else if (load.status === LOAD_STATUSES.Completed) {
    actions.push({
      label: 'Back to In Transit',
      status: LOAD_STATUSES.InTransit,
      icon: <RotateCcw className="h-4 w-4" />,
      variant: 'outline',
      title: 'Revert to In Transit',
    })
  } else if (load.status === LOAD_STATUSES.Cancelled) {
    actions.push({
      label: 'Back to Booked',
      status: LOAD_STATUSES.Booked,
      icon: <RotateCcw className="h-4 w-4" />,
      variant: 'outline',
      title: 'Revert to Booked',
    })
  }

  return (
    <div className="flex items-center gap-1">
      {actions.map((action) => (
        <Button
          key={action.status}
          variant={action.variant ?? 'ghost'}
          size="sm"
          className={`h-8 px-2 ${action.className ?? ''}`}
          title={action.title}
          onClick={() => onAction(action.status as LoadStatus)}
        >
          {action.icon}
        </Button>
      ))}
    </div>
  )
}

function truckDisplayName(t: Truck) {
  return `${t.year} ${t.make} ${t.model} (${t.trailerLengthFt}ft)`
}

export function LoadActionsCell({ load, trucks = [] }: { load: Load; trucks?: Truck[] }) {
  const dispatch = useDispatch<AppDispatch>()
  const [updateLoad] = useUpdateLoadMutation()
  const [selectTruck] = useSelectTruckForLoadMutation()

  const handleStatusUpdate = useCallback(
    (newStatus: LoadStatus) => {
      // 1. Optimistic update to local slice
      dispatch(updateLoadInList({ loadId: load._id, changes: { status: newStatus } }))

      // 2. Fire the PATCH to the server
      updateLoad({ loadId: load._id, body: { status: newStatus } })
    },
    [load._id, dispatch, updateLoad]
  )

  const handleSelectTruck = useCallback(
    (truckId: string | null) => {
      dispatch(updateLoadInList({ loadId: load._id, changes: { selectedTruckId: truckId } }))
      selectTruck({ loadId: load._id, truckId })
    },
    [load._id, dispatch, selectTruck]
  )

  const selectedTruck = trucks.find((t) => t._id === load.selectedTruckId)

  return (
    <div className="flex items-center gap-1">
      <PossibleActions load={load} onAction={handleStatusUpdate} />

      <span className="mx-0.5 h-5 w-px bg-border" aria-hidden="true" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={selectedTruck ? 'ghost' : 'outline'}
            size="sm"
            className={`h-8 px-2 ${selectedTruck ? 'text-green-600' : 'text-amber-600 border-amber-300'}`}
            title={selectedTruck ? `Truck: ${truckDisplayName(selectedTruck)}` : 'Select a truck'}
          >
            <TruckIcon className="h-4 w-4" />
            {selectedTruck && <Check className="h-3 w-3" />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>Assign Truck</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {trucks.length === 0 ? (
            <div className="px-2 py-1.5 text-sm text-muted-foreground">No trucks registered</div>
          ) : (
            trucks.map((t) => (
              <DropdownMenuItem
                key={t._id}
                onSelect={() => handleSelectTruck(t._id)}
                className="flex items-center justify-between"
              >
                <span className="truncate">{truckDisplayName(t)}</span>
                {load.selectedTruckId === t._id && <Check className="h-4 w-4 text-green-600" />}
              </DropdownMenuItem>
            ))
          )}
          {load.selectedTruckId && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => handleSelectTruck(null)}
                className="text-muted-foreground"
              >
                Clear selection
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
