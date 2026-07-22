import React from 'react'
import { Link, matchPath, useLocation } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { RoutePath, ROUTE_CONFIG, getRouteLabel, type RouteMeta } from '@/config/routes'
import { useSelector } from 'react-redux'
import { selectBreadcrumbOverrides } from '@/services/breadcrumbSlice'
import { ToastManager } from '@/components/shared/ToastManager'

export default function PageLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  // Select the full overrides map once (Rules of Hooks safe) — pages populate it
  // with friendly labels for their own entity, and we fall back to route-config
  // labels when no override exists for a given cumulative path.
  const overrides = useSelector(selectBreadcrumbOverrides)
  const segments = location.pathname.split('/').filter(Boolean)

  // Pages with their own Back/Cancel control (e.g. LoadDetail, LoadEdit)
  const currentRouteEntry = (Object.entries(ROUTE_CONFIG) as [RoutePath, RouteMeta][]).find(
    ([path]) => matchPath({ path, end: true }, location.pathname)
  )
  const currentRouteMeta = currentRouteEntry?.[1]
  const hideBreadcrumb = currentRouteMeta?.hideBreadcrumb ?? false

  // Some edit-style pages (e.g. LoadEdit) want Cancel to return to the specific
  // detail page they were opened from
  const locationState = location.state as { from?: RoutePath; viaDetail?: boolean } | null
  const routeMatch = currentRouteEntry
    ? matchPath({ path: currentRouteEntry[0], end: true }, location.pathname)
    : null
  const loadIdParam = routeMatch?.params.loadId
  const headerBackTarget = currentRouteMeta?.headerBackFallback
    ? locationState?.viaDetail && loadIdParam
      ? (`/loads/${loadIdParam}` as RoutePath)
      : (locationState?.from ?? currentRouteMeta.headerBackFallback)
    : null

  const breadcrumbItems =
    segments.length === 0
      ? [{ path: RoutePath.Dashboard, label: getRouteLabel(RoutePath.Dashboard) }]
      : segments.map((_seg, i) => {
          const path = '/' + segments.slice(0, i + 1).join('/')
          const label = overrides[path] ?? getRouteLabel(path)
          return { path, label }
        })

  return (
    <div className="flex h-full flex-col">
      {/* Full-width breadcrumb bar */}
      <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
        <SidebarTrigger className="shrink-0 cursor-pointer rounded-md text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground md:hidden" />
        {hideBreadcrumb && headerBackTarget && (
          <Button variant="ghost" size="sm" asChild className="-ml-2">
            <Link to={headerBackTarget}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </Button>
        )}
        {!hideBreadcrumb && (
          <Breadcrumb className="flex-1">
            <BreadcrumbList>
              {breadcrumbItems.map((item, index) => {
                const isLast = index === breadcrumbItems.length - 1
                return (
                  <React.Fragment key={item.path}>
                    <BreadcrumbItem>
                      {isLast ? (
                        <BreadcrumbPage>{item.label}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink asChild>
                          <Link
                            to={item.path}
                            className="text-primary underline-offset-4 hover:underline hover:text-primary"
                          >
                            {item.label}
                          </Link>
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                    {!isLast && <BreadcrumbSeparator />}
                  </React.Fragment>
                )
              })}
            </BreadcrumbList>
          </Breadcrumb>
        )}
      </header>

      {/* Content area — scroll management delegated to child page components (PageShell) */}
      <div className="flex flex-1 min-h-0">{children}</div>

      {/* Global toast notifications */}
      <ToastManager />
    </div>
  )
}
