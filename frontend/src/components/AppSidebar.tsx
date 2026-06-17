import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { Link, useNavigate } from 'react-router-dom'
import Logo from '@/components/Logo'
import { getNavItems, ROUTE_CONFIG, RoutePath } from '@/config/routes'
import { logoutUser } from '@/services/authSlice'

const LogoutIcon = ROUTE_CONFIG[RoutePath.Logout].icon

export function AppSidebar() {
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logoutUser()
    navigate(RoutePath.Auth)
  }

  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to={RoutePath.Dashboard}>
                <Logo size={24} />
                <span className="font-semibold text-base">LoadLink</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          {getNavItems('main').map((item) => (
            <SidebarMenuItem key={item.path}>
              <SidebarMenuButton asChild>
                <Link to={item.path}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          {getNavItems('bottom').map((item) => (
            <SidebarMenuItem key={item.path}>
              <SidebarMenuButton asChild>
                <Link to={item.path}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout}>
              <LogoutIcon />
              <span>{ROUTE_CONFIG[RoutePath.Logout].label}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
