import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AlertBanner } from '@/components/shared/AlertBanner'

export interface RateConfirmationBannerProps {
  /** URL to the rate confirmation PDF, or null if still generating */
  rcUrl: string | null
  className?: string
}

/**
 * RateConfirmationBanner — shown when a driver has won an auction.
 *
 * Wraps AlertBanner (success variant) and slots in either a PDF
 * download button or a "generating" status message as the action.
 */
export function RateConfirmationBanner({ rcUrl, className }: RateConfirmationBannerProps) {
  return (
    <AlertBanner
      variant="success"
      title="You won this load!"
      message={
        rcUrl ? undefined : 'Rate confirmation is being generated — check your notifications shortly.'
      }
      action={
        rcUrl ? (
          <a href={rcUrl} target="_blank" rel="noopener noreferrer">
            <Button size="sm" className="gap-1.5 whitespace-nowrap">
              <Download className="h-4 w-4" />
              Download Rate Confirmation
            </Button>
          </a>
        ) : undefined
      }
      className={className}
    />
  )
}
