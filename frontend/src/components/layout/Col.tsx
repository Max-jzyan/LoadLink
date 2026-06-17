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
 */
interface ColProps {
  size?: number
  children: React.ReactNode
}

export default function Col({ size = 16, children }: ColProps) {
  return (
    <div className="p-2 max-w" style={{ flex: size }}>
      {children}
    </div>
  )
}
