import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { SidebarTrigger } from '@/components/ui/sidebar'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { RoutePath, getRouteLabel } from '@/config/routes'
import { useGetLoadQuery } from '@/services/loadApi/loadSlice'
import { ToastManager } from '@/components/shared/ToastManager'

// Patterns for routes that have a :loadId parameter
const ID_ROUTE_PREFIXES = [
  `${RoutePath.DriverAuctions}/`,
  `${RoutePath.Loads}/`,
  `${RoutePath.AuctionLive}/`,
]

function isIdRoute(pathname: string): boolean {
  return ID_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

function extractLoadId(pathname: string): string | null {
  for (const prefix of ID_ROUTE_PREFIXES) {
    if (pathname.startsWith(prefix)) {
      const id = pathname.slice(prefix.length)
      if (id) return id
    }
  }
  return null
}

function truncateId(id: string): string {
  return `#${id.slice(-6).toUpperCase()}`
}

export default function PageLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const loadId = extractLoadId(location.pathname)
  const {
    data: load,
    isLoading: loadLoading,
    isError: loadError,
  } = useGetLoadQuery(loadId ?? '', {
    skip: loadId === null,
  })

  const segments = location.pathname.split('/').filter(Boolean)

  // TODO: this is temp; for root path, segments is empty → show just "Dashboard"
  const breadcrumbItems =
    segments.length === 0
      ? [{ path: RoutePath.Dashboard, label: getRouteLabel(RoutePath.Dashboard) }]
      : segments.map((_seg, i) => {
          const path = '/' + segments.slice(0, i + 1).join('/')
          const isLast = i === segments.length - 1
          const isIdSegment = isIdRoute(path) && isLast && loadId !== null

          let label: string
          if (isIdSegment) {
            if (loadLoading) {
              label = 'Loading...'
            } else if (loadError || !load) {
              label = truncateId(loadId)
            } else {
              const origin = load.originAddress.split(',')[0].trim()
              const destination = load.destinationAddress.split(',')[0].trim()
              label = `${origin} → ${destination}`
            }
          } else {
            // Prefer the full cumulative path so e.g. /company/dashboard resolves to
            // "Dashboard" rather than matching /dashboard ("Revenue Center")
            label = getRouteLabel(path)
          }

          return { path, label }
        })

  return (
    <div className="flex h-full flex-col">
      {/* Full-width breadcrumb bar */}
      <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
        <SidebarTrigger className="shrink-0 cursor-pointer rounded-md text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground md:hidden" />
        <Breadcrumb>
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
      </header>

      {/* Content area — scroll management delegated to child page components (PageShell) */}
      <div className="flex flex-1 min-h-0">{children}</div>

      {/* Global toast notifications */}
      <ToastManager />
    </div>
  )
}
