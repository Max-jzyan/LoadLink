import NotificationBell from '@/components/shared/NotificationBell'
import { signOut } from 'firebase/auth'
import {
  ChevronRightIcon,
  LogOutIcon,
  MonitorIcon,
  MoonIcon,
  PlayCircleIcon,
  Settings,
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

export function NavUser() {
  const { isMobile, state } = useSidebar()
  const isCollapsed = state === 'collapsed'
  const navigate = useNavigate()
  const [theme, setTheme] = useState<Theme>(getStoredTheme)

  const role = useSelector(selectRole)
  const { data: profile } = useGetMyProfileQuery()
  const { startTour } = useTourContext()

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

  let roleLabel = ''
  if (profile?.role === 'driver' || role === 'driver') roleLabel = 'Driver'
  if (profile?.role === 'company' || role === 'company') roleLabel = 'Company'

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
                  className="flex cursor-pointer items-center gap-2 rounded-md text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors pr-1"
                >
                  {avatarTrigger}
                  <div className="grid min-w-0 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{displayName}</span>
                    <span className="truncate text-xs capitalize text-muted-foreground">
                      {roleLabel}
                    </span>
                  </div>
                  <ChevronRightIcon className="size-4 shrink-0 text-sidebar-foreground/60" />
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
                {profile?.role === 'driver' || role === 'driver' ? (
                  <button
                    type="button"
                    className="flex w-full cursor-pointer items-center gap-2 px-1 py-1.5 text-left text-sm hover:bg-accent rounded-sm"
                    onClick={() => navigate('/driver')}
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
                ) : (
                  <button
                    type="button"
                    className="flex w-full cursor-pointer items-center gap-2 px-1 py-1.5 text-left text-sm hover:bg-accent rounded-sm"
                    onClick={() => navigate('/company')}
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
                )}
              </DropdownMenuLabel>

              <DropdownMenuSeparator />

              <DropdownMenuGroup>
                <DropdownMenuItem
                  onClick={() => navigate(role === 'driver' ? '/driver/profile' : '/settings')}
                >
                  <Settings />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={startTour}>
                  <PlayCircleIcon />
                  Walkthrough
                </DropdownMenuItem>
              </DropdownMenuGroup>

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
