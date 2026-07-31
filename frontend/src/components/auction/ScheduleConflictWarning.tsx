import { useGetConflictingBidsQuery } from '@/services/driverApi/driverSlice'
import { Badge } from '@/components/ui/badge'
import { Calendar, AlertTriangle, CircleAlert } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatMoney } from '@/lib/format'

interface Conflict {
  loadId: string
  originAddress: string
  destinationAddress: string
  pickupTime: string
  dropoffTime: string
  bidAmount?: number
  conflictType: 'accepted_job' | 'pending_bid'
}

interface ScheduleConflictWarningProps {
  driverId: string | null
  loadId: string
  isAuctionLive: boolean
  isOpen: boolean
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-CA', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export default function ScheduleConflictWarning({
  driverId,
  loadId,
  isAuctionLive,
  isOpen,
}: ScheduleConflictWarningProps) {
  const { data: conflictingBids, isFetching: conflictsLoading } = useGetConflictingBidsQuery(
    { driverId: driverId ?? '', loadId },
    { skip: !isOpen || !driverId || !isAuctionLive }
  )

  const uniqueConflicts: Conflict[] =
    conflictingBids?.filter(
      (conflict, index, self) => index === self.findIndex((c) => c.loadId === conflict.loadId)
    ) ?? []

  const hasConflicts = uniqueConflicts.length > 0
  const hasAcceptedJobConflict = uniqueConflicts.some((c) => c.conflictType === 'accepted_job')

  if (conflictsLoading) {
    return <p className="text-sm text-muted-foreground">Checking for scheduling conflicts…</p>
  }

  if (!hasConflicts) {
    return null
  }

  return (
    <div
      className={`rounded-lg border p-3 space-y-2 ${
        hasAcceptedJobConflict
          ? 'border-red-300 dark:border-red-800 bg-red-100 dark:bg-red-950/30'
          : 'border-yellow-300 dark:border-yellow-800 bg-yellow-100 dark:bg-yellow-950/30'
      }`}
    >
      <div className="flex items-start gap-2">
        {hasAcceptedJobConflict ? (
          <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
        ) : (
          <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
        )}
        <div>
          <p
            className={`text-sm font-semibold ${hasAcceptedJobConflict ? 'text-red-700 dark:text-red-400' : 'text-yellow-800 dark:text-yellow-300'}`}
          >
            {hasAcceptedJobConflict
              ? 'Critical: This load conflicts with an already accepted job'
              : 'This load conflicts with an existing commitment'}
          </p>
          <p
            className={`text-xs mt-0.5 ${hasAcceptedJobConflict ? 'text-red-700 dark:text-red-400' : 'text-yellow-700 dark:text-yellow-300'}`}
          >
            {hasAcceptedJobConflict
              ? 'You already have an accepted job that overlaps with this load. Proceeding is at your own risk and may result in penalties or cancellation.'
              : "You already have a pending bid that overlaps with this load's schedule. Proceeding is at your own risk and may result in scheduling conflicts."}
          </p>
        </div>
      </div>

      <div className="max-h-64 overflow-y-auto space-y-2 pl-6">
        {uniqueConflicts.map((conflict) => {
          const isAcceptedJob = conflict.conflictType === 'accepted_job'
          return (
            <div
              key={conflict.loadId}
              className={`rounded p-2 text-xs ${
                isAcceptedJob
                  ? 'border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/20'
                  : 'border border-yellow-300 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/20'
              }`}
            >
              <div className="flex items-center gap-1 font-medium text-foreground">
                {isAcceptedJob && <CircleAlert className="h-3.5 w-3.5 shrink-0 text-red-600" />}
                <Link
                  to={`/driverAuctions/${conflict.loadId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${isAcceptedJob ? 'text-red-700 dark:text-red-400' : 'text-yellow-800 dark:text-yellow-300'} hover:underline`}
                >
                  {conflict.originAddress} → {conflict.destinationAddress}
                </Link>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground mt-1">
                <Calendar className="h-3 w-3" />
                <span>
                  {formatDate(conflict.pickupTime)} — {formatDate(conflict.dropoffTime)}
                </span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-muted-foreground">Status</span>
                <Badge variant={isAcceptedJob ? 'destructive' : 'outline'} className="text-xs">
                  {isAcceptedJob ? 'Accepted job' : `Bid: ${formatMoney(conflict.bidAmount ?? 0)}`}
                </Badge>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
