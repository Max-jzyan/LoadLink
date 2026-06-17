import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import useAuth from '@/hooks/useAuth'

// Redirects unauthed users to login
const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

export default ProtectedRoute
