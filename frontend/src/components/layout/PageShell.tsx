import type { ReactNode } from 'react'

interface PageShellProps {
  /** Page title shown at the top (scrolls away) */
  title: string
  /** Optional subtitle line shown below the title */
  subtitle?: string | null
  /** Content rendered in the sticky bar (filters, tabs, controls) */
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
 *
 * @example
 * <PageShell
 *   title="Active Loads"
 *   subtitle="Acme Transport · Updated 2m ago"
 *   actions={<Button>Post New Load</Button>}
 *   stickyBar={<CompanyLoadFilterBar />}
 * >
 *   <LoadsPageLayout ... />
 * </PageShell>
 */
export default function PageShell({
  title,
  subtitle,
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
        {(stickyBar || actions) && (
          <div className="sticky top-0 z-[9999] bg-background border-b shadow-sm mb-3">
            <div className="flex items-center justify-between px-4 py-2">
              <div className="flex-1 min-w-0">{stickyBar}</div>
              {actions && <div className="flex items-center gap-2 shrink-0 ml-3">{actions}</div>}
            </div>
          </div>
        )}

        {/* ── Page content ── */}
        <div className="px-4 pb-4">{children}</div>
      </div>
    </div>
  )
}
