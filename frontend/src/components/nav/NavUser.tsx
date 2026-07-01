import { signOut } from 'firebase/auth'
import {
  BellIcon,
  ChevronRightIcon,
  LogOutIcon,
  MonitorIcon,
  MoonIcon,
  Settings,
  SunIcon,
} from 'lucide-react'
import { useState } from 'react'
import { useSelector } from 'react-redux'
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

import { clearStoredRole, getStoredRole } from '@/hooks/useRole'
import { applyTheme, getStoredTheme, type Theme } from '@/hooks/useTheme'
import { auth } from '@/lib/firebase'
import { selectMongoId } from '@/services/authSlice'
import { useGetDriverProfileQuery } from '@/services/driverApi/driverSlice'

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

  const mongoId = useSelector(selectMongoId)
  const { data: driver } = useGetDriverProfileQuery(mongoId!, { skip: !mongoId })

  async function handleLogout() {
    clearStoredRole()
    await signOut(auth)
    navigate('/login')
  }

  function handleThemeChange(value: string) {
    const t = value as Theme
    applyTheme(t)
    setTheme(t)
  }

  const displayName =
    driver?.name ??
    (typeof driver?.email === 'string' && driver.email ? driver.email.split('@')[0] : 'User')

  const fallbackRole = getStoredRole()
  let roleLabel = ''
  if (driver?.role === 'driver' || fallbackRole === 'driver') roleLabel = 'Driver'
  if (driver?.role === 'company' || fallbackRole === 'company') roleLabel = 'Company'

  const initials = displayName.slice(0, 2).toUpperCase()
  const profilePictureUrl = driver?.profilePictureUrl ?? ''

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <div
          className={`flex items-center gap-1 px-2 py-1.5 rounded-md ${
            isCollapsed ? 'justify-center' : ''
          }`}
        >
          {!isCollapsed && (
            <>
              <Avatar className="h-8 w-8 rounded-lg shrink-0">
                <AvatarImage src={profilePictureUrl} alt={displayName} />
                <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 min-w-0 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{displayName}</span>
                <span className="truncate text-xs capitalize text-muted-foreground">
                  {roleLabel}
                </span>
              </div>
            </>
          )}

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  title="Notifications"
                  className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                >
                  <BellIcon className="size-4" />
                </button>
              </TooltipTrigger>
              {isCollapsed && (
                <TooltipContent side="right" sideOffset={8}>
                  Notifications
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>

          {!isCollapsed && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  title="Account menu"
                  className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                >
                  <ChevronRightIcon className="size-4" />
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                className="w-fit min-w-56 z-[100]"
                side={isMobile ? 'bottom' : 'right'}
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarImage src={profilePictureUrl} alt={displayName} />
                      <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">{displayName}</span>
                      <span className="truncate text-xs capitalize">{roleLabel}</span>
                    </div>
                  </div>
                </DropdownMenuLabel>

                <DropdownMenuSeparator />

                <DropdownMenuGroup>
                  <DropdownMenuItem>
                    <Settings />
                    Settings
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
          )}
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
