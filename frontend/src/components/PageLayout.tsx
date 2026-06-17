import React from 'react'
import { useLocation, Link } from 'react-router-dom'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { RoutePath, getRouteLabel } from '@/config/routes'

export default function PageLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation()

  const segments = location.pathname.split('/').filter(Boolean)

  // TODO: this is temp; for root path, segments is empty → show just "Dashboard"
  const breadcrumbItems =
    segments.length === 0
      ? [{ path: RoutePath.Dashboard, label: getRouteLabel(RoutePath.Dashboard) }]
      : segments.map((seg, i) => {
          const path = '/' + segments.slice(0, i + 1).join('/')
          return { path, label: getRouteLabel('/' + seg) }
        })

  return (
    <div className="flex h-full flex-col">
      {/* Full-width breadcrumb bar */}
      <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
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
                        <Link to={item.path}>{item.label}</Link>
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

      {/* content scrolls internally so the outer page never gets a scrollbar */}
      <div className="flex flex-1 overflow-y-auto p-6">{children}</div>
    </div>
  )
}
