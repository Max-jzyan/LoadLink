import { Link, useLocation } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar'

export interface NavItem {
  path: string
  label: string
  icon: LucideIcon
}

export function NavMain({ items }: { items: NavItem[] }) {
  const { pathname } = useLocation()

  return (
    <SidebarMenu>
      {items.map((item) => (
        <SidebarMenuItem key={item.path}>
          <SidebarMenuButton asChild isActive={pathname === item.path} tooltip={item.label}>
            <Link to={item.path}>
              <item.icon />
              <span>{item.label}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  )
}
