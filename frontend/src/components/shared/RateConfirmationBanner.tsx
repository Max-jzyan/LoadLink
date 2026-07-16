import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface RateConfirmationBannerProps {
  /** URL to the rate confirmation PDF, or null if still generating */
  rcUrl: string | null
  className?: string
}

/**
 * RateConfirmationBanner - Displays when a driver has won a load
 *
 * Shows a success banner at the top of the page with:
 * - A "You won this load!" message
 * - Either a download button for the RC PDF or a loading message
 *
 * This banner animates in from the top when rendered.
 */
export function RateConfirmationBanner({ rcUrl, className }: RateConfirmationBannerProps) {
  return (
    <div
      className={cn(
        'w-full rounded-xl border border-primary/20 bg-primary/5 p-3',
        'animate-in slide-in-from-top-2 duration-300',
        className
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-primary">View your rate confirmation</p>
        {rcUrl ? (
          <a href={rcUrl} target="_blank" rel="noopener noreferrer">
            <Button size="sm" className="gap-1.5 whitespace-nowrap">
              <Download className="h-4 w-4" />
              Download Rate Confirmation
            </Button>
          </a>
        ) : (
          <p className="text-xs text-muted-foreground whitespace-nowrap">
            Rate confirmation is being generated — check your notifications shortly.
          </p>
        )}
      </div>
    </div>
  )
}
