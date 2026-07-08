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
 *
 * The `stackAt` prop controls the breakpoint at which Col children stack vertically
 * (flex-col) instead of sitting side-by-side (flex-row). Below the specified breakpoint,
 * columns stack; at and above the breakpoint, they display side-by-side.
 * Accepts standard Tailwind breakpoints: "sm" | "md" | "lg" | "xl" | "2xl". Defaults to "md".
 */
interface RowProps {
  size?: number
  stackAt?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  children: React.ReactNode
  className?: string
}

const breakpointClasses: Record<string, string> = {
  sm: 'sm:flex-row',
  md: 'md:flex-row',
  lg: 'lg:flex-row',
  xl: 'xl:flex-row',
  '2xl': '2xl:flex-row',
}

export default function Row({ size = 16, stackAt = 'md', children, className }: RowProps) {
  const responsiveClass = breakpointClasses[stackAt]

  return (
    <div
      className={`flex flex-col ${responsiveClass} flex-wrap max-h ${className ?? ''}`}
      style={{ flex: size }}
    >
      {children}
    </div>
  )
}
