/**
 * Row is a horizontal flex container that distributes its children (Col components)
 * side-by-side within a LayoutGrid.
 *
 * The `size` prop controls the row's vertical space allocation via CSS `flex`.
 * When multiple Rows share the same `size` value, they split the available height equally.
 * A larger `size` value gives the row proportionally more vertical space.
 *
 * Typically all Rows use `size={8}`, giving each row an equal share of vertical space.
 *
 * Horizontal distribution is handled by the `size` prop on child Col components,
 * which use a 16-unit grid (col sizes should sum to 16 for a full-width row).
 */
interface RowProps {
  size: number
  children: React.ReactNode
}

export default function Row({ size, children }: RowProps) {
  return (
    <div className="flex max-h" style={{ flex: size }}>
      {children}
    </div>
  )
}
