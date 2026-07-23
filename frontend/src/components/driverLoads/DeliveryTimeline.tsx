import type { Load } from '@/services/loadApi/loadEnum'
import { MapPin, Coffee, Moon, Droplets, Package2, Flag, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'
import { TimelineEventAction, TimelineIconType } from '@/types/enums'
import type { Checkpoint } from '@/lib/checkpoints'
import { CheckpointLabel } from '@/components/shared/CheckpointLabel'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'

interface TimelineEvent {
  stage: string
  time: Date
  location: string
  action: TimelineEventAction
  iconType: TimelineIconType
}

// computes estimated stops from pickup/dropoff times based on HOS (hours of service) rules
function buildTimeline(load: Load): TimelineEvent[] {
  const pickup = new Date(load.pickupTime)
  const dropoff = new Date(load.dropoffTime)
  const totalHours = (dropoff.getTime() - pickup.getTime()) / 3600000

  const events: TimelineEvent[] = [
    {
      stage: 'Pickup',
      time: pickup,
      location: load.originAddress,
      action: TimelineEventAction.Start,
      iconType: TimelineIconType.Pickup,
    },
  ]

  if (totalHours > 4.5) {
    events.push({
      stage: 'Rest Stop',
      time: new Date(pickup.getTime() + 4.5 * 3600000),
      location: 'Rest Area',
      action: TimelineEventAction.Break,
      iconType: TimelineIconType.Rest,
    })
  }
  if (totalHours > 11) {
    events.push({
      stage: 'Sleep Break',
      time: new Date(pickup.getTime() + 11 * 3600000),
      location: 'Truck Plaza',
      action: TimelineEventAction.Rest,
      iconType: TimelineIconType.Sleep,
    })
  }
  if (totalHours > 16) {
    events.push({
      stage: 'Fuel Stop',
      time: new Date(pickup.getTime() + 16 * 3600000),
      location: 'Travel Center',
      action: TimelineEventAction.Refuel,
      iconType: TimelineIconType.Fuel,
    })
  }

  events.push({
    stage: 'Delivery',
    time: dropoff,
    location: load.destinationAddress,
    action: TimelineEventAction.Complete,
    iconType: TimelineIconType.Delivery,
  })

  return events
}

function formatEventTime(date: Date): string {
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

const ICON_CONFIG: Record<TimelineIconType, { Icon: LucideIcon; bg: string; dot: string }> = {
  [TimelineIconType.Pickup]: { Icon: MapPin, bg: 'bg-blue-500', dot: 'bg-blue-500' },
  [TimelineIconType.Rest]: { Icon: Coffee, bg: 'bg-amber-500', dot: 'bg-amber-500' },
  [TimelineIconType.Sleep]: { Icon: Moon, bg: 'bg-slate-500', dot: 'bg-slate-500' },
  [TimelineIconType.Fuel]: { Icon: Droplets, bg: 'bg-amber-500', dot: 'bg-amber-500' },
  [TimelineIconType.Checkpoint]: { Icon: Flag, bg: 'bg-gray-400', dot: 'bg-gray-400' },
  [TimelineIconType.Delivery]: { Icon: Package2, bg: 'bg-green-500', dot: 'bg-green-500' },
}

const ACTION_CLS: Record<TimelineEventAction, string> = {
  [TimelineEventAction.Start]: 'border border-blue-300 text-blue-700 bg-blue-50',
  [TimelineEventAction.Break]: 'border border-amber-300 text-amber-700 bg-amber-50',
  [TimelineEventAction.Rest]: 'border border-slate-300 text-slate-600 bg-slate-50',
  [TimelineEventAction.Refuel]: 'border border-amber-300 text-amber-700 bg-amber-50',
  [TimelineEventAction.Complete]: 'border border-green-300 text-green-700 bg-green-50',
}

interface DeliveryTimelineProps {
  load: Load
  aiAvailable: boolean
  // fallback for ai insights
  checkpoints: Checkpoint[]
  isCheckpointsPending: boolean
}

export default function DeliveryTimeline({
  load,
  aiAvailable,
  checkpoints,
  isCheckpointsPending,
}: DeliveryTimelineProps) {
  if (!aiAvailable) {
    return (
      <CheckpointTimeline
        load={load}
        checkpoints={checkpoints}
        isCheckpointsPending={isCheckpointsPending}
      />
    )
  }

  const events = buildTimeline(load)

  return (
    <div className="flex flex-col gap-4">
      {/* horizontal visual step timeline */}
      <div className="flex items-start overflow-x-auto pb-1">
        {events.map((ev, i) => {
          const { Icon, bg } = ICON_CONFIG[ev.iconType]
          return (
            <div key={i} className="flex items-center flex-1 min-w-0">
              <div className="flex flex-col items-center min-w-[64px]">
                <div
                  className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center text-white',
                    bg
                  )}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <p className="text-[10px] font-medium text-center mt-1 leading-tight">{ev.stage}</p>
                <p className="text-[9px] text-muted-foreground text-center leading-tight">
                  {formatEventTime(ev.time)}
                </p>
              </div>
              {i < events.length - 1 && (
                <div className="flex-1 border-t-2 border-dashed border-muted-foreground/30 mb-7 mx-1 min-w-[8px]" />
              )}
            </div>
          )
        })}
      </div>

      {/* detail table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="py-1.5 text-xs">Stage</TableHead>
            <TableHead className="py-1.5 text-xs">Time</TableHead>
            <TableHead className="py-1.5 text-xs">Location</TableHead>
            <TableHead className="py-1.5 text-xs">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((ev, i) => {
            const { dot } = ICON_CONFIG[ev.iconType]
            return (
              <TableRow key={i} className="border-b border-border/50">
                <TableCell className="py-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className={cn('w-2 h-2 rounded-full shrink-0', dot)} />
                    {ev.stage}
                  </div>
                </TableCell>
                <TableCell className="py-2 text-xs text-muted-foreground">
                  {formatEventTime(ev.time)}
                </TableCell>
                <TableCell className="py-2 text-xs text-muted-foreground truncate max-w-[180px]">
                  {ev.location}
                </TableCell>
                <TableCell className="py-2 text-xs">
                  <span
                    className={cn(
                      'inline-flex items-center px-2 py-0.5 rounded-full text-[10px]',
                      ACTION_CLS[ev.action]
                    )}
                  >
                    {ev.action}
                  </span>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

interface CheckpointStage {
  stage: string
  time: Date
  iconType: TimelineIconType
  location: string
  checkpoint?: Checkpoint
}

function CheckpointTimeline({
  load,
  checkpoints,
  isCheckpointsPending,
}: {
  load: Load
  checkpoints: Checkpoint[]
  isCheckpointsPending: boolean
}) {
  if (isCheckpointsPending) {
    return (
      <div className="flex items-center justify-center gap-2 h-28 text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        Calculating route checkpoints…
      </div>
    )
  }

  const pickup = new Date(load.pickupTime)
  const dropoff = new Date(load.dropoffTime)
  const totalMs = dropoff.getTime() - pickup.getTime()
  const n = checkpoints.length

  const stages: CheckpointStage[] = [
    {
      stage: 'Pickup',
      time: pickup,
      iconType: TimelineIconType.Pickup,
      location: load.originAddress,
    },
    ...checkpoints.map((checkpoint, i) => ({
      stage: `C${i + 1}`,
      time: new Date(pickup.getTime() + ((i + 1) / (n + 1)) * totalMs),
      iconType: TimelineIconType.Checkpoint,
      location: checkpoint.label,
      checkpoint,
    })),
    {
      stage: 'Delivery',
      time: dropoff,
      iconType: TimelineIconType.Delivery,
      location: load.destinationAddress,
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      {/* horizontal visual step timeline */}
      <div className="flex items-start overflow-x-auto pb-1">
        {stages.map((ev, i) => {
          const { Icon, bg } = ICON_CONFIG[ev.iconType]
          return (
            <div key={i} className="flex items-center flex-1 min-w-0">
              <div className="flex flex-col items-center min-w-[64px]">
                <div
                  className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center text-white',
                    bg
                  )}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <p className="text-[10px] font-medium text-center mt-1 leading-tight">{ev.stage}</p>
                <p className="text-[9px] text-muted-foreground text-center leading-tight">
                  {formatEventTime(ev.time)}
                </p>
              </div>
              {i < stages.length - 1 && (
                <div className="flex-1 border-t-2 border-dashed border-muted-foreground/30 mb-7 mx-1 min-w-[8px]" />
              )}
            </div>
          )
        })}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="py-1.5 text-xs">Stage</TableHead>
            <TableHead className="py-1.5 text-xs">Time</TableHead>
            <TableHead className="py-1.5 text-xs">Location</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {stages.map((ev, i) => {
            const { dot } = ICON_CONFIG[ev.iconType]
            return (
              <TableRow key={i} className="border-b border-border/50">
                <TableCell className="py-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className={cn('w-2 h-2 rounded-full shrink-0', dot)} />
                    {ev.stage}
                  </div>
                </TableCell>
                <TableCell className="py-2 text-xs text-muted-foreground">
                  {formatEventTime(ev.time)}
                </TableCell>
                <TableCell className="py-2 text-xs text-muted-foreground truncate max-w-[180px]">
                  {ev.checkpoint ? (
                    <CheckpointLabel checkpoint={ev.checkpoint} />
                  ) : (
                    ev.location
                  )}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
