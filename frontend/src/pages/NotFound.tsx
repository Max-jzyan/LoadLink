import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { RoutePath } from '@/config/routes'
import { Button } from '@/components/ui/button'
import { FileQuestion } from 'lucide-react'
import { selectRole } from '@/services/authSlice'
import PageShell from '@/components/layout/PageShell'

export default function NotFound() {
  const role = useSelector(selectRole)
  const dashboardPath = role === 'company' ? RoutePath.CompanyDashboard : RoutePath.Dashboard

  return (
    <PageShell title="Page not found">
      <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        <div className="flex flex-col items-center gap-3">
          <FileQuestion className="h-20 w-20 text-muted-foreground/40" />
          <h1 className="text-7xl font-extrabold tracking-tight text-muted-foreground/30">404</h1>
        </div>

        <div className="flex flex-col items-center gap-1">
          <p className="max-w-sm text-sm text-muted-foreground">
            The page you're looking for doesn't exist boss
          </p>
        </div>

        <Button asChild>
          <Link to={dashboardPath}>Back to Dashboard</Link>
        </Button>
      </div>
    </PageShell>
  )
}
