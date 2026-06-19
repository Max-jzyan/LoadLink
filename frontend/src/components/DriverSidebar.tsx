import { Link } from 'react-router-dom'
import { LayoutDashboard, ClipboardList, MapPin, Gavel } from 'lucide-react'
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
import { RoutePath } from '@/config/routes'

const DRIVER_NAV = [
  { path: RoutePath.Dashboard, label: 'Dashboard', icon: LayoutDashboard },
  { path: RoutePath.DriverAuctions, label: 'Auctions', icon: Gavel },
  { path: RoutePath.DriverLoads, label: 'My Loads', icon: ClipboardList },
  { path: RoutePath.Map, label: 'Map', icon: MapPin },
]

export function DriverSidebar() {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="flex flex-row items-center gap-1 p-2 group-data-[collapsible=icon]:justify-center">
        <Link
          to={RoutePath.Dashboard}
          className="flex flex-1 cursor-pointer items-center gap-2 group-data-[collapsible=icon]:hidden"
        >
          <div className="flex shrink-0 items-center justify-center leading-tight">
            <Logo size={32} />
          </div>
          <div className="grid min-w-0 text-lg leading-tight">
            <span className="truncate font-semibold">LoadLink</span>
          </div>
        </Link>
        <SidebarTrigger className="shrink-0 cursor-pointer rounded-md text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:size-8" />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <NavMain items={DRIVER_NAV} />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <NavUser />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
