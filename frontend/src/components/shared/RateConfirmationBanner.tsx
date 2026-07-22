import { Download, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AlertBanner } from '@/components/shared/AlertBanner'

export interface RateConfirmationBannerProps {
  /** URL to the rate confirmation PDF, or null if still generating */
  rcUrl: string | null
  /** URL to the Bill of Lading PDF, or null if still generating */
  bolUrl?: string | null
  className?: string
}

/**
 * RateConfirmationBanner — shown when a driver has won an auction.
 *
 * Shows download buttons for the Rate Confirmation and Bill of Lading
 * (if available). Falls back to a "generating" message until both are ready.
 */
export function RateConfirmationBanner({ rcUrl, bolUrl, className }: RateConfirmationBannerProps) {
  const hasAnyDoc = rcUrl || bolUrl
  return (
    <AlertBanner
      variant="success"
      title="You won this load!"
      message={
        hasAnyDoc
          ? undefined
          : 'Your documents are being generated — check your notifications shortly.'
      }
      action={
        hasAnyDoc ? (
          <div className="flex flex-wrap gap-2">
            {rcUrl && (
              <a href={rcUrl} target="_blank" rel="noopener noreferrer">
                <Button size="sm" className="gap-1.5 whitespace-nowrap">
                  <Download className="h-4 w-4" />
                  Rate Confirmation
                </Button>
              </a>
            )}
            {bolUrl && (
              <a href={bolUrl} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="outline" className="gap-1.5 whitespace-nowrap">
                  <FileText className="h-4 w-4" />
                  Bill of Lading
                </Button>
              </a>
            )}
          </div>
        ) : undefined
      }
      className={className}
    />
  )
}
