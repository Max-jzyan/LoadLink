import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import useAuth from '@/hooks/useAuth'
import { getStoredRole } from '@/hooks/useRole'
import { RoutePath } from '@/config/routes'
import Spinner from '@/components/shared/Spinner'

const ROLE_HOME = {
  driver: RoutePath.Dashboard,
  company: RoutePath.Dashboard,
} as const

// Prevents authed users from accessing public only pages (like login, sign up etc)
// Only redirects if BOTH of these conditions are true
// 1. Firebase session exists
// 2. A role is stored in localStorage
// If the user is authed but has no stored role (like new device, cleared
// storage, private tab), fall through to the login page so they can re choose their role

const PublicRoute = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (user) {
    const role = getStoredRole()
    if (role) {
      // Fully authed + role known means go straight to their home page
      return <Navigate to={ROLE_HOME[role]} replace />
    }
    // Authed but no role means fall through to LoginPage to re choose role
  }

  return <>{children}</>
}

export default PublicRoute
