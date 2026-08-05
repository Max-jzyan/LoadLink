import '@/components/layout/PageShell.less'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'
import React, { useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'

export interface TabOption {
  value: string
  label: string
}

interface PageShellProps {
  /** Page title shown at the top (scrolls away) */
  title: string | React.JSX.Element
  /** Optional subtitle line shown below the title */
  subtitle?: string | null
  /** Optional banner rendered below the title, above sticky bar */
  banner?: ReactNode
  /** Optional tab bar rendered in the sticky area above stickyBar */
  tabs?: {
    options: TabOption[]
    value: string
    onValueChange: (value: string) => void
    /** When set, the active tab is reflected as a URL search param with this key.
     *  The first tab's value is treated as default and is omitted from the URL. */
    searchParamKey?: string
  }
  /** Content rendered in the sticky bar (filters, controls) */
  stickyBar?: ReactNode
  /** Actions rendered on the right side of the sticky bar */
  actions?: ReactNode
  /** When true, the outer container doesn't scroll — inner elements control scrolling */
  noScroll?: boolean
  children: ReactNode
}

/**
 * PageShell wraps page content with a standardised title header and sticky bar.
 *
 * - `title` scrolls away naturally as the user scrolls down.
 * - `banner` renders below the title, above the sticky bar area.
 * - `stickyBar` sticks to the top of the viewport once the title scrolls past.
 * - `actions` are rendered on the right side of the sticky bar row.
 * - `tabs` renders a tab bar above stickyBar in the sticky area.
 *
 * @example
 * <PageShell
 *   title="Revenue Center"
 *   subtitle="Updated 2m ago"
 *   banner={<RateConfirmationBanner rcUrl="..." />}
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
  banner,
  tabs,
  stickyBar,
  actions,
  noScroll = false,
  children,
}: PageShellProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const hasSyncedRef = useRef(false)

  // On mount, sync URL search param → tab state (only if a valid tab is specified)
  useEffect(() => {
    if (!tabs?.searchParamKey || hasSyncedRef.current) return
    const paramVal = searchParams.get(tabs.searchParamKey)
    if (paramVal && tabs.options.some((o) => o.value === paramVal) && paramVal !== tabs.value) {
      tabs.onValueChange(paramVal)
    }
    hasSyncedRef.current = true
    // Run only once on mount — ignore dependency changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleTabClick = (optionValue: string) => {
    tabs?.onValueChange(optionValue)
    if (!tabs?.searchParamKey) return
    const defaultVal = tabs.options[0]?.value
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (optionValue === defaultVal) {
          next.delete(tabs.searchParamKey!)
        } else {
          next.set(tabs.searchParamKey!, optionValue)
        }
        return next
      },
      { replace: true }
    )
  }
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className={cn('flex-1', noScroll ? 'flex flex-col min-h-0' : 'overflow-y-auto')}>
        {/* ── Title area (scrolls away) ── */}
        <div className="px-4 pt-4 pb-2">
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>

        {/* ── Banner area (static, pushed by title) ── */}
        {banner && <div className="px-4 pb-2">{banner}</div>}

        {/* ── Sticky bar ── */}
        {(tabs || stickyBar || actions) && (
          <div className="sticky top-0 z-[9999] w-full border-b bg-background/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/80 mb-3">
            {/* Tab bar (optional) */}
            {tabs && (
              <div className="px-4 pt-1 pb-0">
                <div className="flex w-fit -mb-px">
                  {tabs.options.map((option) => (
                    <Button
                      key={option.value}
                      variant="ghost"
                      size="sm"
                      className={cn(
                        'rounded-none px-4 border-b-2 border-transparent -mb-px',
                        'hover:bg-transparent hover:text-foreground',
                        tabs.value === option.value
                          ? 'text-primary border-b-primary font-medium'
                          : 'text-muted-foreground'
                      )}
                      onClick={() => handleTabClick(option.value)}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            {/* Sticky bar row */}
            {(stickyBar || actions) && (
              <div className="page-shell-sticky-row flex w-full min-w-0 items-center justify-between gap-2 px-4 py-2">
                <div className="min-w-0 flex-1">{stickyBar}</div>
                {actions && <div className="ml-3 flex shrink-0 items-center gap-2">{actions}</div>}
              </div>
            )}
          </div>
        )}

        {/* ── Page content ── */}
        <div className={cn('px-4 pb-4', noScroll && 'flex-1 flex flex-col min-h-0')}>
          {children}
        </div>
      </div>
    </div>
  )
}
