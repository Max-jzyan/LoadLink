import { Link } from 'react-router-dom'
import { RoutePath } from '@/config/routes'
import { Button } from '@/components/ui/button'
import { FileQuestion } from 'lucide-react'
import { getStoredRole } from '@/hooks/useRole'

export default function NotFound() {
  const role = getStoredRole()
  const dashboardPath =
    role === 'company' ? RoutePath.CompanyDashboard : RoutePath.Dashboard

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
      <div className="flex flex-col items-center gap-3">
        <FileQuestion className="h-20 w-20 text-muted-foreground/40" />
        <h1 className="text-7xl font-extrabold tracking-tight text-muted-foreground/30">404</h1>
      </div>

      <div className="flex flex-col items-center gap-1">
        <h2 className="text-2xl font-semibold tracking-tight">Page not found</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          The page you're looking for doesn't exist boss
        </p>
      </div>

      <Button asChild>
        <Link to={dashboardPath}>Back to Dashboard</Link>
      </Button>
    </div>
  )
}
