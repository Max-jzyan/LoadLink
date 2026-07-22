import type { UserRole } from '@/types/enums'
import {
  Bell,
  ClipboardList,
  FileText,
  Gavel,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  MapPin,
  MessageSquare,
  PlusCircle,
  Settings,
  ShieldAlert,
  ShieldCheck,
  User,
  Users,
  type LucideIcon,
} from 'lucide-react'

export const RoutePath = {
  CompanyDashboard: '/company/dashboard',
  CompanyAuctions: '/company/auctions',
  Test: '/test',
  Dashboard: '/dashboard',
  DriverLoads: '/driverLoads',
  DriverAuctions: '/driverAuctions',
  BlocklistPreferences: '/blocklist',
  Messages: '/messages',
  Report: '/report',
  ReportFraud: '/report/fraud',
  ReportInaccurate: '/report/inaccurate',
  DriverProfile: '/driver/',
  DriverPublicProfile: '/driver/:driverId',
  CompanyProfile: '/company/',
  CompanyPublicProfile: '/company/:companyId',
  AuctionLive: '/auctionLive',
  PostLoad: '/loads/post',
  LoadDetail: '/loads/:loadId',
  LoadEdit: '/loads/:loadId/edit',
  Map: '/map',
  Settings: '/settings',
  Help: '/help',
  Logout: '/logout',
  Notifications: '/notifications',
  // Admin paths
  AdminDashboard: '/admin/dashboard',
  AdminDocuments: '/admin/documents',
  AdminUsers: '/admin/users',
  AdminRateConfirmations: '/admin/rate-confirmations',
  AdminReports: '/admin/reports',
} as const

export type RoutePath = (typeof RoutePath)[keyof typeof RoutePath]

export interface RouteMeta {
  label: string
  icon: LucideIcon
  /** Where this item appears in the nav. null = not in any nav group. */
  navGroup: 'main' | 'bottom' | null
  // which roles can see this nav item, where undefined = visible to all roles
  roles?: UserRole[]
  /** Suppresses the top breadcrumb bar for this route — used when the page has its own Back/Cancel control instead. */
  hideBreadcrumb?: boolean
  /** When set (and hideBreadcrumb is true), the top bar renders a Back link in place of the breadcrumb, targeting location.state.from if present, else this route. */
  headerBackFallback?: RoutePath
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
  [RoutePath.CompanyAuctions]: {
    label: 'Auctions',
    icon: Gavel,
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
  /** Driver profile page — accessed via the user dropdown's Settings item, not in the sidebar nav. */
  [RoutePath.DriverProfile]: {
    label: 'Profile',
    icon: User,
    navGroup: null,
    roles: ['driver'],
  },
  [RoutePath.DriverPublicProfile]: {
    label: 'Driver Profile',
    icon: User,
    navGroup: null,
    roles: ['company'],
  },
  [RoutePath.Report]: { label: 'My Reports', icon: ShieldAlert, navGroup: null },
  [RoutePath.ReportFraud]: { label: 'Report Fraud', icon: ShieldAlert, navGroup: null },
  [RoutePath.ReportInaccurate]: {
    label: 'Report Inaccurate Details',
    icon: ShieldAlert,
    navGroup: null,
  },
  [RoutePath.AuctionLive]: {
    label: 'Auction Live',
    icon: Gavel,
    navGroup: null,
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
    hideBreadcrumb: true,
    headerBackFallback: RoutePath.CompanyAuctions,
  },
  [RoutePath.LoadEdit]: {
    label: 'Edit Load',
    icon: ClipboardList,
    navGroup: null,
    roles: ['company'],
    hideBreadcrumb: true,
    headerBackFallback: RoutePath.CompanyAuctions,
  },
  // Not in the sidebar — reached only via a loadId query param from an
  // in-transit row's "Track"/"Notify Company" button.
  [RoutePath.Map]: { label: 'Map', icon: MapPin, navGroup: null, roles: ['driver', 'company'] },
  [RoutePath.Messages]: {
    label: 'Messages',
    icon: MessageSquare,
    navGroup: 'main',
    roles: ['driver', 'company'],
  },
  [RoutePath.CompanyProfile]: {
    label: 'Profile',
    icon: User,
    navGroup: null,
    roles: ['company'],
  },
  [RoutePath.CompanyPublicProfile]: {
    label: 'Company Profile',
    icon: User,
    navGroup: null,
    roles: ['driver'],
  },
  [RoutePath.BlocklistPreferences]: {
    label: 'Blocklist',
    icon: ShieldAlert,
    navGroup: 'main',
    roles: ['driver', 'company'],
  },
  [RoutePath.Settings]: { label: 'Settings', icon: Settings, navGroup: null },
  [RoutePath.Help]: { label: 'Help', icon: HelpCircle, navGroup: null },
  [RoutePath.Logout]: { label: 'Logout', icon: LogOut, navGroup: null },
  [RoutePath.Notifications]: {
    label: 'Notifications',
    icon: Bell,
    navGroup: null,
  },
  // Admin nav items
  [RoutePath.AdminDashboard]: {
    label: 'Admin Dashboard',
    icon: LayoutDashboard,
    navGroup: 'main',
    roles: ['admin'],
  },
  [RoutePath.AdminDocuments]: {
    label: 'Document Review',
    icon: FileText,
    navGroup: 'main',
    roles: ['admin'],
  },
  [RoutePath.AdminUsers]: {
    label: 'Users',
    icon: Users,
    navGroup: 'main',
    roles: ['admin'],
  },
  [RoutePath.AdminRateConfirmations]: {
    label: 'Rate Confirmations',
    icon: ShieldCheck,
    navGroup: 'main',
    roles: ['admin'],
  },
  [RoutePath.AdminReports]: {
    label: 'Reports',
    icon: ShieldAlert,
    navGroup: 'main',
    roles: ['admin'],
  },
}

export const ROLE_HOME: Record<UserRole, RoutePath> = {
  driver: RoutePath.Dashboard,
  company: RoutePath.CompanyDashboard,
  admin: RoutePath.AdminDashboard,
}

/** Get label for any path (used by breadcrumbs). Falls back to Title Case of the segment. */
export const getRouteLabel = (path: string): string => {
  if (ROUTE_CONFIG[path as RoutePath]) {
    return ROUTE_CONFIG[path as RoutePath].label
  }

  const segment = path.split('/').filter(Boolean).pop() ?? path
  if (ROUTE_CONFIG[('/' + segment) as RoutePath]) {
    return ROUTE_CONFIG[('/' + segment) as RoutePath].label
  }

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
