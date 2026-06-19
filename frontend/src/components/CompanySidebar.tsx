import { Link } from 'react-router-dom'
import { LayoutDashboard, ClipboardList, Gavel, MapPin, Truck } from 'lucide-react'
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

const COMPANY_NAV = [
  { path: RoutePath.CompanyDashboard, label: 'Dashboard', icon: LayoutDashboard },
  { path: RoutePath.Loads, label: 'Loads', icon: ClipboardList },
  { path: RoutePath.AuctionLive, label: 'Auction Live', icon: Gavel },
  { path: RoutePath.Fleet, label: 'My Fleet', icon: Truck },
  { path: RoutePath.Map, label: 'Map', icon: MapPin },
  { path: RoutePath.Test, label: 'Test', icon: MapPin },
]

export function CompanySidebar() {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="flex flex-row items-center gap-1 p-2 group-data-[collapsible=icon]:justify-center">
        <Link
          to={RoutePath.CompanyDashboard}
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
            <NavMain items={COMPANY_NAV} />
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
