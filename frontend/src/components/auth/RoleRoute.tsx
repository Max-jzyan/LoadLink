import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { selectRole } from '@/services/authSlice'
import { ROUTE_CONFIG, ROLE_HOME, type RoutePath } from '@/config/routes'

// front-end role guard.
export default function RoleRoute({ path, children }: { path: RoutePath; children: ReactNode }) {
  const role = useSelector(selectRole)
  const allow = ROUTE_CONFIG[path]?.roles // undefined = visible to all roles

  if (allow && role && !allow.includes(role)) {
    return <Navigate to={ROLE_HOME[role]} replace />
  }

  return <>{children}</>
}
