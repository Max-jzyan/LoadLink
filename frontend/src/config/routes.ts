import type { UserRole } from '@/types/enums'
import {
  ClipboardList,
  Gavel,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  MapPin,
  PlusCircle,
  Settings,
  ShieldAlert,
  User,
  type LucideIcon,
} from 'lucide-react'

export const RoutePath = {
  CompanyDashboard: '/company/dashboard',
  Test: '/test',
  Dashboard: '/dashboard',
  DriverLoads: '/driverLoads',
  DriverAuctions: '/driverAuctions',
  BlocklistPreferences: '/blocklist',
  Report: '/report',
  ReportFraud: '/report/fraud',
  ReportInaccurate: '/report/inaccurate',
  DriverProfile: '/driver/profile',
  DriverPublicProfile: '/driver/profile/:driverId',
  Loads: '/loads',
  AuctionLive: '/auctionLive',
  PostLoad: '/loads/post',
  LoadDetail: '/loads/:loadId',
  LoadEdit: '/loads/:loadId/edit',
  Map: '/map',
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
  // which roles can see this nav item, where undefined = visible to all roles
  roles?: UserRole[]
}

export const ROUTE_CONFIG: Record<RoutePath, RouteMeta> = {
  [RoutePath.Dashboard]: {
    label: 'Revenue Center',
    icon: LayoutDashboard,
    navGroup: 'main',
    roles: ['driver'],
  },
  [RoutePath.CompanyDashboard]: {
    label: 'Dashboard',
    icon: LayoutDashboard,
    navGroup: 'main',
    roles: ['company'],
  },
  [RoutePath.Test]: { label: 'Test', icon: LayoutDashboard, navGroup: null },
  [RoutePath.DriverLoads]: {
    label: 'My Loads',
    icon: ClipboardList,
    navGroup: 'main',
    roles: ['driver'],
  },
  [RoutePath.DriverAuctions]: {
    label: 'Auctions',
    icon: Gavel,
    navGroup: 'main',
    roles: ['driver'],
  },
  [RoutePath.DriverProfile]: {
    label: 'My Profile',
    icon: User,
    navGroup: 'main',
    roles: ['driver'],
  },
  [RoutePath.DriverPublicProfile]: {
    label: 'Driver Profile',
    icon: User,
    navGroup: null,
    // accessible to logged-in users regardless of role
  },
  [RoutePath.Report]: { label: 'My Reports', icon: ShieldAlert, navGroup: null },
  [RoutePath.ReportFraud]: { label: 'Report Fraud', icon: ShieldAlert, navGroup: null },
  [RoutePath.ReportInaccurate]: {
    label: 'Report Inaccurate Details',
    icon: ShieldAlert,
    navGroup: null,
  },
  [RoutePath.Loads]: { label: 'Loads', icon: ClipboardList, navGroup: 'main', roles: ['company'] },
  [RoutePath.AuctionLive]: {
    label: 'Auction Live',
    icon: Gavel,
    navGroup: null, // Not in nav - accessed via /driverAuctions/:loadId
  },
  [RoutePath.PostLoad]: {
    label: 'Post Load',
    icon: PlusCircle,
    navGroup: null,
    roles: ['company'],
  },
  [RoutePath.LoadDetail]: {
    label: 'Load Detail',
    icon: ClipboardList,
    navGroup: null,
    roles: ['company'],
  },
  [RoutePath.LoadEdit]: {
    label: 'Edit Load',
    icon: ClipboardList,
    navGroup: null,
    roles: ['company'],
  },
  [RoutePath.Map]: { label: 'Map', icon: MapPin, navGroup: 'main' },
  [RoutePath.BlocklistPreferences]: {
    label: 'Blocklist',
    icon: ShieldAlert,
    navGroup: 'main',
  },
  // TODO: Fleet route coming soon — add Fleet: '/fleet' to RoutePath and uncomment below:
  // { label: 'My Fleet', icon: Truck, navGroup: 'main', roles: ['company'] }
  [RoutePath.Settings]: { label: 'Settings', icon: Settings, navGroup: 'bottom' },
  [RoutePath.Help]: { label: 'Help', icon: HelpCircle, navGroup: 'bottom' },
  [RoutePath.Logout]: { label: 'Logout', icon: LogOut, navGroup: null },
}

export const ROLE_HOME: Record<UserRole, RoutePath> = {
  driver: RoutePath.DriverLoads,
  company: RoutePath.Loads,
}

/** Get label for any path (used by breadcrumbs). Falls back to Title Case of the segment. */
export const getRouteLabel = (path: string): string => {
  // exact match in ROUTE_CONFIG (e.g. '/fleet' -> 'My Fleet')
  if (ROUTE_CONFIG[path as RoutePath]) {
    return ROUTE_CONFIG[path as RoutePath].label
  }

  // extract last segment and try '/'+segment as a route
  const segment = path.split('/').filter(Boolean).pop() ?? path
  if (ROUTE_CONFIG[('/' + segment) as RoutePath]) {
    return ROUTE_CONFIG[('/' + segment) as RoutePath].label
  }

  // fallback: convert camelCase / kebab-case -> Title Case
  return segment
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

/** Sidebar items filtered by nav group. */
export const getNavItems = (group: 'main' | 'bottom', role?: UserRole) =>
  (Object.entries(ROUTE_CONFIG) as [RoutePath, RouteMeta][])
    .filter(([, meta]) => meta.navGroup === group)
    .filter(([, meta]) => !meta.roles || !role || meta.roles.includes(role))
    .map(([path, meta]) => ({ path, ...meta }))
