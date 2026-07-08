import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

export interface TabOption {
  value: string
  label: string
}

interface PageShellProps {
  /** Page title shown at the top (scrolls away) */
  title: string
  /** Optional subtitle line shown below the title */
  subtitle?: string | null
  /** Optional tab bar rendered in the sticky area above stickyBar */
  tabs?: {
    options: TabOption[]
    value: string
    onValueChange: (value: string) => void
  }
  /** Content rendered in the sticky bar (filters, controls) */
  stickyBar?: ReactNode
  /** Actions rendered on the right side of the sticky bar */
  actions?: ReactNode
  children: ReactNode
}

/**
 * PageShell wraps page content with a standardised title header and sticky bar.
 *
 * - `title` scrolls away naturally as the user scrolls down.
 * - `stickyBar` sticks to the top of the viewport once the title scrolls past.
 * - `actions` are rendered on the right side of the sticky bar row.
 * - `tabs` renders a segmented-button tab bar above stickyBar in the sticky area.
 *
 * @example
 * <PageShell
 *   title="Revenue Center"
 *   subtitle="Updated 2m ago"
 *   tabs={{
 *     options: [
 *       { value: 'completed', label: 'Completed' },
 *       { value: 'potential', label: 'Potential Revenue' },
 *     ],
 *     value: viewMode,
 *     onValueChange: setViewMode,
 *   }}
 *   actions={<Button>Refresh</Button>}
 *   stickyBar={<RevenueFilterBar ... />}
 * >
 *   <div>Content</div>
 * </PageShell>
 */
export default function PageShell({
  title,
  subtitle,
  tabs,
  stickyBar,
  actions,
  children,
}: PageShellProps) {
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto">
        {/* ── Title area (scrolls away) ── */}
        <div className="px-4 pt-4 pb-2">
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>

        {/* ── Sticky bar ── */}
        {(tabs || stickyBar || actions) && (
          <div className="sticky top-0 z-[9999] bg-background border-b shadow-sm mb-3">
            {/* Tab bar (optional) */}
            {tabs && (
              <div className="px-4 pt-2 pb-1">
                <div className="flex gap-0.5 p-0.5 bg-muted/60 rounded-lg w-fit">
                  {tabs.options.map((option) => (
                    <Button
                      key={option.value}
                      variant="ghost"
                      size="sm"
                      className={cn(
                        'rounded-md px-3.5 border',
                        tabs.value === option.value
                          ? 'bg-primary text-primary-foreground border-primary/30 shadow-sm hover:bg-primary/90'
                          : 'text-muted-foreground border-transparent hover:bg-muted-foreground/10'
                      )}
                      onClick={() => tabs.onValueChange(option.value)}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            {/* Sticky bar row */}
            {(stickyBar || actions) && (
              <div className="flex items-center justify-between px-4 py-2">
                <div className="flex-1 min-w-0">{stickyBar}</div>
                {actions && <div className="flex items-center gap-2 shrink-0 ml-3">{actions}</div>}
              </div>
            )}
          </div>
        )}

        {/* ── Page content ── */}
        <div className="px-4 pb-4">{children}</div>
      </div>
    </div>
  )
}
