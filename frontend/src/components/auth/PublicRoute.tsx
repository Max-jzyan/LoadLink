import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import useAuth from '@/hooks/useAuth'
import { selectRole } from '@/services/authSlice'
import { ROLE_HOME } from '@/config/routes'
import Spinner from '@/components/shared/Spinner'

// Prevents authed users from accessing public-only pages (login, sign up, etc.)
// Only redirects when BOTH:
//   1. an auth session exists, AND
//   2. the server-resolved role is known (Redux)
// If authed but role is still unknown (unregistered account), fall through to
// the login/signup pages so the user can complete registration.
const PublicRoute = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth()
  const role = useSelector(selectRole)

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (user && role) {
    return <Navigate to={ROLE_HOME[role]} replace />
  }

  return <>{children}</>
}

export default PublicRoute
