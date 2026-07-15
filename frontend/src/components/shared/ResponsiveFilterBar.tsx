import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { type ReactNode, useLayoutEffect, useRef, useState } from 'react'

export interface ResponsiveFilterControl {
  id: string
  label: string
  content: ReactNode
}

interface ResponsiveFilterBarProps {
  controls: ResponsiveFilterControl[]
  actions?: ReactNode
  className?: string
  moreLabel?: string
}

const GAP_PX = 8
const OVERFLOW_BUTTON_WIDTH_PX = 124

function getVisibleControlIds(
  containerWidth: number,
  widths: Record<string, number>,
  controls: ResponsiveFilterControl[],
  actionWidth: number,
  hasActions: boolean,
  overflowButtonWidth: number
) {
  if (containerWidth <= 0) {
    return []
  }

  const availableWidth = Math.max(0, containerWidth - (hasActions ? actionWidth + GAP_PX : 0))
  const visibleIds = [] as string[]
  let usedWidth = 0

  for (let index = 0; index < controls.length; index += 1) {
    const control = controls[index]
    const controlWidth = widths[control.id] ?? 0
    const nextUsedWidth = usedWidth + (usedWidth > 0 ? GAP_PX : 0) + controlWidth
    const remainingControls = controls.length - index - 1
    const requiredOverflowSpace = remainingControls > 0 ? overflowButtonWidth + GAP_PX : 0

    if (nextUsedWidth + requiredOverflowSpace <= availableWidth) {
      visibleIds.push(control.id)
      usedWidth = nextUsedWidth
    } else {
      break
    }
  }

  return visibleIds
}

export default function ResponsiveFilterBar({
  controls,
  actions,
  className,
  moreLabel = 'More Filters',
}: ResponsiveFilterBarProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const actionsRef = useRef<HTMLDivElement>(null)
  const overflowTriggerMeasurementRef = useRef<HTMLDivElement>(null)
  const hiddenMeasurementsRef = useRef<HTMLDivElement>(null)
  const measurementsRef = useRef<Record<string, HTMLDivElement | null>>({})
  const [visibleIds, setVisibleIds] = useState<string[]>([])

  useLayoutEffect(() => {
    const measure = () => {
      const container = containerRef.current
      const actionArea = actionsRef.current
      const overflowTriggerMeasurement = overflowTriggerMeasurementRef.current
      if (!container) return

      const containerWidth = container.getBoundingClientRect().width
      const actionWidth = actionArea?.getBoundingClientRect().width ?? 0
      const overflowButtonWidth = overflowTriggerMeasurement?.getBoundingClientRect().width ?? OVERFLOW_BUTTON_WIDTH_PX
      const widths = Object.fromEntries(
        controls.map((control) => {
          const element = measurementsRef.current[control.id]
          return [control.id, element?.getBoundingClientRect().width ?? 0]
        })
      )

      const nextVisibleIds = getVisibleControlIds(
        containerWidth,
        widths,
        controls,
        actionWidth,
        Boolean(actions),
        overflowButtonWidth
      )

      setVisibleIds((current) => {
        if (
          current.length === nextVisibleIds.length &&
          current.every((id, index) => id === nextVisibleIds[index])
        ) {
          return current
        }
        return nextVisibleIds
      })
    }

    const rafMeasure = () => window.requestAnimationFrame(measure)

    measure()
    const resizeObserver = new ResizeObserver(rafMeasure)
    const observeNode = containerRef.current
    if (observeNode) {
      resizeObserver.observe(observeNode)
    }

    const parentResizeObserver = new ResizeObserver(rafMeasure)
    const parentNode = observeNode?.parentElement
    if (parentNode) {
      parentResizeObserver.observe(parentNode)
    }

    const hiddenResizeObserver = new ResizeObserver(rafMeasure)
    const hiddenNode = hiddenMeasurementsRef.current
    if (hiddenNode) {
      hiddenResizeObserver.observe(hiddenNode)
    }

    const mutationObserver = new MutationObserver(rafMeasure)
    if (observeNode) {
      mutationObserver.observe(observeNode, {
        childList: true,
        subtree: true,
        attributes: true,
      })
    }

    window.addEventListener('resize', rafMeasure)

    return () => {
      resizeObserver.disconnect()
      parentResizeObserver.disconnect()
      hiddenResizeObserver.disconnect()
      mutationObserver.disconnect()
      window.removeEventListener('resize', rafMeasure)
    }
  }, [actions, controls])

  const visibleControls = controls.filter((control) => visibleIds.includes(control.id))
  const overflowControls = controls.filter((control) => !visibleIds.includes(control.id))
  const overflowCount = overflowControls.length
  const overflowLabel = overflowCount > 0 ? `${moreLabel} (${overflowCount})` : moreLabel

  return (
    <div
      ref={containerRef}
      className={cn('relative flex w-full min-w-0 items-center gap-2 overflow-hidden', className)}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
        <div className="flex min-w-0 items-center gap-2 overflow-hidden">
          {visibleControls.map((control) => (
            <div key={control.id} className="shrink-0">
              {control.content}
            </div>
          ))}
        </div>

        {overflowControls.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="shrink-0">
                <Button variant="secondary" size="sm" className="font-semibold">
                  {overflowLabel}
                </Button>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-3">
              <div className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto">
                {overflowControls.map((control) => (
                  <div key={control.id} className="w-full">
                    <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {control.label}
                    </div>
                    <div className="flex flex-col gap-2">{control.content}</div>
                  </div>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {actions && (
        <div ref={actionsRef} className="ml-auto flex shrink-0 items-center gap-2">
          {actions}
        </div>
      )}

      <div
        ref={hiddenMeasurementsRef}
        className="pointer-events-none invisible absolute left-0 top-0 flex items-center gap-2"
      >
        {controls.map((control) => (
          <div
            key={`${control.id}-measurement`}
            className="shrink-0"
            ref={(node) => {
              measurementsRef.current[control.id] = node
            }}
          >
            {control.content}
          </div>
        ))}
        <div ref={overflowTriggerMeasurementRef} className="shrink-0">
          <Button variant="secondary" size="sm" className="font-semibold">
            {moreLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}