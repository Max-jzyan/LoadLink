import { cn } from '@/lib/utils'

interface SpinnerProps {
  /** Extra classes — useful for sizing or margin overrides */
  className?: string
  /** Center the spinner inside a full-height flex container */
  fullPage?: boolean
}

/**
 * Reusable loading spinner.
 *
 * Usage:
 *   <Spinner />                    — inline, default size
 *   <Spinner fullPage />           — centred inside a min-h-[40vh] wrapper
 *   <Spinner className="h-12 w-12" />  — custom size
 */
export default function Spinner({ className, fullPage }: SpinnerProps) {
  const spin = (
    <div
      className={cn(
        'animate-spin rounded-full border-4 border-muted border-t-primary h-8 w-8',
        className
      )}
    />
  )

  if (fullPage) {
    return <div className="flex flex-1 items-center justify-center min-h-[40vh]">{spin}</div>
  }

  return spin
}
