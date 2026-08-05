export const ARROW = ' → '

interface RouteAxisTickProps {
  x?: number
  y?: number
  payload?: { value?: string | number }
  /** Width of the whole axis, handed to every tick by Recharts. */
  width?: number
  visibleTicksCount?: number
}

export function RouteAxisTick({
  x = 0,
  y = 0,
  payload,
  width,
  visibleTicksCount,
}: RouteAxisTickProps) {
  const [origin = '', destination = ''] = String(payload?.value ?? '').split(ARROW)
  const band = width && visibleTicksCount ? width / visibleTicksCount : 64

  return (
    <foreignObject x={x - band / 2} y={y} width={band} height={32}>
      <div className="px-1 text-center text-xs leading-tight text-muted-foreground">
        <div className="truncate">{origin}</div>
        <div className="truncate">{`→ ${destination}`}</div>
      </div>
    </foreignObject>
  )
}
