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
    <div className="flex min-h-screen w-full flex-col">
      {/* Full-width breadcrumb bar */}
      <div className="flex w-full items-center gap-4 border-b bg-background px-6 py-3">
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
      </div>

      {/* content area */}
      <div className="flex flex-1">{children}</div>
    </div>
  )
}
