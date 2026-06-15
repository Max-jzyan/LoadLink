import type { ReactNode } from 'react'

/**
 * LayoutGrid is the top-level vertical container for the 16-unit flex grid system.
 * It stacks Row components top-to-bottom using `flex-col`.
 *
 * Usage example:
 *   LayoutGrid
 *     Row (size={8})
 *       Col (size={8})  -- 50% width
 *       Col (size={8})  -- 50% width
 *     Row (size={8})
 *       Col (size={16}) -- 100% width
 *
 * Rows within a LayoutGrid share vertical space proportionally based on their `size` prop.
 * All rows typically use the same `size` value (e.g. 8) so they split height equally.
 */
interface LayoutGridProps {
  children: ReactNode
}

export default function LayoutGrid({ children }: LayoutGridProps) {
  return <div className="flex flex-col h-full w-full">{children}</div>
}
