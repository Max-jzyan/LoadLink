/**
 * Col is a vertical flex item that represents a single column within a Row.
 *
 * The `size` prop controls the column's horizontal space allocation via CSS `flex`.
 * When multiple Cols share the same `size` value within a Row, they split the available width equally.
 * A larger `size` value gives the column proportionally more horizontal space.
 *
 * Column sizes follow a 16-unit grid system — the `size` values of all Cols
 * within a single Row should sum to 16 for a full-width row.
 *
 * Vertical distribution is handled by the `size` prop on parent Row components.
 *
 * The optional `minWidth` prop sets a minimum width in pixels for the column,
 * preventing it from shrinking below that value when the row is resized.
 */
interface ColProps {
  size?: number
  minWidth?: number
  children: React.ReactNode
}

export default function Col({ size = 16, minWidth, children }: ColProps) {
  return (
    <div
      className="flex h-full flex-col overflow-hidden p-2"
      style={{ flex: size, minWidth: minWidth ?? undefined }}
    >
      {children}
    </div>
  )
}
