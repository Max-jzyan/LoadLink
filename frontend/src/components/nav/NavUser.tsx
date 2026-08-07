import NotificationBell from '@/components/shared/NotificationBell'
import { signOut } from 'firebase/auth'
import {
  ChevronRightIcon,
  LogOutIcon,
  MonitorIcon,
  MoonIcon,
  PlayCircleIcon,
  SunIcon,
} from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SidebarMenu, SidebarMenuItem, useSidebar } from '@/components/ui/sidebar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

import { applyTheme, getStoredTheme, type Theme } from '@/hooks/useTheme'
import { auth } from '@/lib/firebase'
import { selectRole, setManualLogout } from '@/services/authSlice'
import { useGetMyProfileQuery } from '@/services/userApi/userSlice'
import { useSelector } from 'react-redux'
import { useTourContext } from '@/contexts/TourContext'

const THEME_ICONS: Record<Theme, React.ReactNode> = {
  light: <SunIcon className="h-4 w-4" />,
  dark: <MoonIcon className="h-4 w-4" />,
  system: <MonitorIcon className="h-4 w-4" />,
}

/** Where the account header button navigates, per role (admins have no profile page). */
const ACCOUNT_PATHS: Record<string, string> = {
  driver: '/driver',
  company: '/company',
  admin: '/admin/dashboard',
}

/** Menu label for the role-specific walkthrough. */
const WALKTHROUGH_LABELS: Record<string, string> = {
  driver: 'Driver walkthrough',
  company: 'Company walkthrough',
  admin: 'Admin walkthrough',
}

export function NavUser() {
  const { isMobile, state } = useSidebar()
  const isCollapsed = state === 'collapsed'
  const navigate = useNavigate()
  const [theme, setTheme] = useState<Theme>(getStoredTheme)

  const role = useSelector(selectRole)
  const { data: profile } = useGetMyProfileQuery()
  const { startTour, hasTour } = useTourContext()

  async function handleLogout() {
    setManualLogout()
    await signOut(auth)
    navigate('/login')
  }

  function handleThemeChange(value: string) {
    const t = value as Theme
    applyTheme(t)
    setTheme(t)
  }

  const displayName =
    profile?.name ??
    (typeof profile?.email === 'string' && profile.email ? profile.email.split('@')[0] : 'User')

  const effectiveRole = profile?.role ?? role

  let roleLabel = ''
  if (effectiveRole === 'driver') roleLabel = 'Driver'
  if (effectiveRole === 'company') roleLabel = 'Company'
  if (effectiveRole === 'admin') roleLabel = 'Admin'

  // Admins have no profile page — send them to their dashboard instead.
  const accountPath = ACCOUNT_PATHS[effectiveRole ?? 'company']

  /** Role-specific walkthrough label so it's obvious the tour is tailored. */
  const walkthroughLabel = WALKTHROUGH_LABELS[effectiveRole ?? 'driver']

  const initials = displayName.slice(0, 2).toUpperCase()
  const profilePictureUrl = profile?.profilePictureUrl ?? ''

  const avatarTrigger = (
    <Avatar
      className={`rounded-lg shrink-0 cursor-pointer hover:opacity-80 transition-opacity ${
        isCollapsed ? 'h-7 w-7' : 'h-8 w-8'
      }`}
    >
      <AvatarImage src={profilePictureUrl} alt={displayName} />
      <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
    </Avatar>
  )

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <div
          className={`flex items-center gap-1 px-2 py-1.5 rounded-md ${
            isCollapsed ? 'flex-col justify-center' : ''
          }`}
        >
          <NotificationBell />

          <DropdownMenu>
            {isCollapsed ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        title={displayName}
                        data-tour="nav-user"
                        className="flex shrink-0 cursor-pointer items-center justify-center rounded-md text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                      >
                        {avatarTrigger}
                      </button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8}>
                    {displayName}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  title="Account menu"
                  data-tour="nav-user"
                  className="flex flex-1 cursor-pointer items-center gap-2 rounded-md text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors pr-1"
                >
                  {avatarTrigger}
                  <div className="grid min-w-0 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{displayName}</span>
                    <span className="truncate text-xs capitalize text-muted-foreground">
                      {roleLabel}
                    </span>
                  </div>
                  <ChevronRightIcon className="ml-auto size-4 shrink-0 text-sidebar-foreground/60" />
                </button>
              </DropdownMenuTrigger>
            )}

            <DropdownMenuContent
              className="w-fit min-w-56 z-[100]"
              side={isMobile ? 'bottom' : 'right'}
              align="end"
              sideOffset={4}
            >
              <DropdownMenuLabel className="p-0 font-normal">
                <button
                  type="button"
                  className="flex w-full cursor-pointer items-center gap-2 px-1 py-1.5 text-left text-sm hover:bg-accent rounded-sm"
                  onClick={() => navigate(accountPath)}
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={profilePictureUrl} alt={displayName} />
                    <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{displayName}</span>
                    <span className="truncate text-xs capitalize">{roleLabel}</span>
                  </div>
                </button>
              </DropdownMenuLabel>

              {hasTour && (
                <>
                  <DropdownMenuSeparator />

                  <DropdownMenuGroup>
                    <DropdownMenuItem onClick={startTour}>
                      <PlayCircleIcon />
                      {walkthroughLabel}
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </>
              )}

              <DropdownMenuSeparator />

              <DropdownMenuLabel className="text-xs text-muted-foreground px-2 py-1">
                Theme
              </DropdownMenuLabel>

              <DropdownMenuRadioGroup value={theme} onValueChange={handleThemeChange}>
                {(['light', 'dark', 'system'] as Theme[]).map((t) => (
                  <DropdownMenuRadioItem key={t} value={t} className="capitalize">
                    {THEME_ICONS[t]}
                    <span className="ml-2 capitalize">{t}</span>
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={handleLogout}
                className="text-destructive focus:text-destructive"
              >
                <LogOutIcon />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
