import { Button } from '@/components/ui/button'
import { useUpdateLoadMutation } from '@/services/loadApi/loadSlice'
import { LOAD_STATUSES, type LoadStatus } from '@/types/enums'
import type { Load } from '@/services/loadApi/loadEnum'
import { Truck, CircleCheck, RotateCcw, XCircle } from 'lucide-react'
import { useCallback } from 'react'
import { useDispatch } from 'react-redux'
import { updateLoadInList } from '@/services/driverLoadsSlice'
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
        icon: <Truck className="h-4 w-4" />,
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

export function LoadActionsCell({ load }: { load: Load }) {
  const dispatch = useDispatch<AppDispatch>()
  const [updateLoad] = useUpdateLoadMutation()

  const handleStatusUpdate = useCallback(
    (newStatus: LoadStatus) => {
      // 1. Optimistic update to local slice
      dispatch(updateLoadInList({ loadId: load._id, changes: { status: newStatus } }))

      // 2. Fire the PATCH to the server
      updateLoad({ loadId: load._id, body: { status: newStatus } })
    },
    [load._id, dispatch, updateLoad]
  )

  return <PossibleActions load={load} onAction={handleStatusUpdate} />
}
