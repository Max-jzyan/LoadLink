import { Link } from 'react-router-dom'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarRail,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { NavMain } from '@/components/nav/NavMain'
import { NavUser } from '@/components/nav/NavUser'
import Logo from '@/components/Logo'
import { getNavItems, RoutePath } from '@/config/routes'
import type { UserRole } from '@/types/enums'

interface AppSidebarProps {
  role: UserRole
}

export function AppSidebar({ role }: AppSidebarProps) {
  const mainNav = getNavItems('main', role)
  const bottomNav = getNavItems('bottom', role)
  const dashboardPath = role === 'company' ? RoutePath.CompanyDashboard : RoutePath.Dashboard

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="flex flex-row items-center gap-1 p-2 group-data-[collapsible=icon]:justify-center">
        <Link
          to={dashboardPath}
          className="flex flex-1 cursor-pointer items-center gap-2 group-data-[collapsible=icon]:hidden"
        >
          <div className="flex shrink-0 items-center justify-center leading-tight">
            <Logo size={32} />
          </div>
          <div className="grid min-w-0 text-lg leading-tight">
            <span className="truncate font-semibold">LoadLink</span>
          </div>
        </Link>
        <SidebarTrigger className="hidden md:flex shrink-0 cursor-pointer rounded-md text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:size-8" />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <NavMain items={mainNav} />
          </SidebarGroupContent>
        </SidebarGroup>

        {bottomNav.length > 0 && (
          <SidebarGroup className="mt-auto">
            <SidebarGroupContent>
              <NavMain items={bottomNav} />
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <NavUser />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
