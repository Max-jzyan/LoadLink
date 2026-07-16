import PageShell from '@/components/layout/PageShell'
import { ShieldAlert } from 'lucide-react'

export default function ForbiddenPage() {
  return (
    <PageShell title="Access Denied">
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <ShieldAlert className="h-10 w-10 text-destructive" />
        <p className="text-destructive font-medium">403 — Forbidden</p>
        <p className="text-sm text-muted-foreground">You do not have permission to view this page.</p>
      </div>
    </PageShell>
  )
}