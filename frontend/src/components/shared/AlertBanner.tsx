import { cn } from '@/lib/utils'
import { AlertTriangle, CheckCircle, Clock, Info } from 'lucide-react'
import type { ReactNode } from 'react'

export type AlertBannerVariant = 'success' | 'warning' | 'error' | 'info'

export interface AlertBannerProps {
  variant: AlertBannerVariant
  title: string
  /** Optional body text rendered below the title */
  message?: string
  /** Optional node slotted to the right — a button, link, etc. */
  action?: ReactNode
  className?: string
}

const variantStyles: Record<
  AlertBannerVariant,
  { wrapper: string; icon: ReactNode; title: string; msg: string }
> = {
  success: {
    wrapper: 'border-primary/20 bg-primary/5',
    icon: <CheckCircle className="h-4 w-4 text-primary" />,
    title: 'text-primary',
    msg: 'text-primary/70',
  },
  warning: {
    wrapper: 'border-amber-400/40 bg-amber-50 dark:bg-amber-900/10',
    icon: <Clock className="h-4 w-4 text-amber-600" />,
    title: 'text-amber-700 dark:text-amber-400',
    msg: 'text-amber-600/80 dark:text-amber-400/80',
  },
  error: {
    wrapper: 'border-destructive/40 bg-destructive/5',
    icon: <AlertTriangle className="h-4 w-4 text-destructive" />,
    title: 'text-destructive',
    msg: 'text-destructive/80',
  },
  info: {
    wrapper: 'border-blue-400/40 bg-blue-50 dark:bg-blue-900/10',
    icon: <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />,
    title: 'text-blue-700 dark:text-blue-400',
    msg: 'text-blue-600/80 dark:text-blue-400/80',
  },
}

/**
 * AlertBanner — a compact inline banner for success, warning, error, or info states.
 *
 * Designed to be passed into PageShell's `banner` prop, but works anywhere.
 *
 * @example
 * <AlertBanner
 *   variant="warning"
 *   title="1 document expires soon"
 *   message="HAZMAT cert expires in 12 days — upload a renewed copy."
 *   action={<Button size="sm">Update</Button>}
 * />
 */
export function AlertBanner({ variant, title, message, action, className }: AlertBannerProps) {
  const s = variantStyles[variant]

  return (
    <div
      className={cn(
        'flex gap-3 rounded-lg border px-4 py-3',
        message ? 'items-start' : 'items-center',
        'animate-in slide-in-from-top-2 duration-300',
        s.wrapper,
        className
      )}
    >
      <div className={cn('shrink-0', message && 'mt-0.5')}>{s.icon}</div>

      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium', s.title)}>{title}</p>
        {message && <p className={cn('text-xs mt-0.5', s.msg)}>{message}</p>}
      </div>

      {action && <div className="shrink-0 flex items-center">{action}</div>}
    </div>
  )
}
