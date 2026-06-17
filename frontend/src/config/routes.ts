import {
  ClipboardList,
  HelpCircle,
  LayoutDashboard,
  LayoutList,
  LogOut,
  MapPin,
  Settings,
  Truck,
  type LucideIcon,
} from 'lucide-react'
import type { UserRole } from '@/hooks/useRole'

export const RoutePath = {
  Test: '/test',
  Dashboard: '/dashboard',
  DriverLoads: '/driverLoads',
  DriverAuctions: '/driverAuctions',
  Loads: '/loads',
  PostLoad: '/loads/post',
  Map: '/map',
  Fleet: '/fleet',
  Settings: '/settings',
  Help: '/help',
  Logout: '/logout',
} as const

export type RoutePath = (typeof RoutePath)[keyof typeof RoutePath]

export interface RouteMeta {
  label: string
  icon: LucideIcon
  /** Where this item appears in the nav. null = not in any nav group. */
  navGroup: 'main' | 'bottom' | null
  // Which roles can see this nav item, where undefined = visible to all roles
  roles?: UserRole[]
}

export const ROUTE_CONFIG: Record<RoutePath, RouteMeta> = {
  [RoutePath.Dashboard]: { label: 'Dashboard', icon: LayoutDashboard, navGroup: 'main' },
  [RoutePath.Test]: { label: 'Test', icon: LayoutDashboard, navGroup: 'main' },
  [RoutePath.DriverLoads]: { label: 'DriverLoads', icon: ClipboardList, navGroup: 'main' },
  [RoutePath.DriverAuctions]: { label: 'DriverAuctions', icon: LayoutList, navGroup: 'main' },
  [RoutePath.Loads]: { label: 'Loads', icon: ClipboardList, navGroup: 'main' },
  [RoutePath.Map]: { label: 'Map', icon: MapPin, navGroup: 'main' },
  [RoutePath.Fleet]: { label: 'My Fleet', icon: Truck, navGroup: 'main' },
  [RoutePath.Settings]: { label: 'Settings', icon: Settings, navGroup: 'bottom' },
  [RoutePath.Help]: { label: 'Help', icon: HelpCircle, navGroup: 'bottom' },
  [RoutePath.Logout]: { label: 'Logout', icon: LogOut, navGroup: null },
}

/** Get label for any path (used by breadcrumbs). Falls back to Title Case of the segment. */
export const getRouteLabel = (path: string): string => {
  // Exact match in ROUTE_CONFIG (e.g. '/fleet' → 'My Fleet')
  if (ROUTE_CONFIG[path as RoutePath]) {
    return ROUTE_CONFIG[path as RoutePath].label
  }

  // Extract last segment and try '/'+segment as a route
  const segment = path.split('/').filter(Boolean).pop() ?? path
  if (ROUTE_CONFIG[('/' + segment) as RoutePath]) {
    return ROUTE_CONFIG[('/' + segment) as RoutePath].label
  }

  // Fallback: convert camelCase / kebab-case → Title Case
  return segment
    .replace(/([a-z])([A-Z])/g, '$1 $2') // camelCase → "camel Case"
    .replace(/-/g, ' ') // kebab-case → space separated
    .replace(/\b\w/g, (c) => c.toUpperCase()) // Capitalize each word
}

/** Sidebar items filtered by nav group. */
// TODO: connect the optional role based filtering to the sidebars -> hardcoded right now (DRIVER_NAV adn COMPANT_NAV)
export const getNavItems = (group: 'main' | 'bottom', role?: UserRole) =>
  (Object.entries(ROUTE_CONFIG) as [RoutePath, RouteMeta][])
    .filter(([, meta]) => meta.navGroup === group)
    .filter(([, meta]) => !meta.roles || !role || meta.roles.includes(role))
    .map(([path, meta]) => ({ path, ...meta }))
