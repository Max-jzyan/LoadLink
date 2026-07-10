import { Progress } from '@/components/ui/progress'
import type { EligibilityFlags } from '@/services/driverApi/driverEnum'
import { AlertTriangle } from 'lucide-react'

interface EligibilityBadgeProps {
  flags: EligibilityFlags
  recommendationScore: number
  className?: string
}

const ELIGIBILITY_LABELS: Record<keyof EligibilityFlags, string> = {
  eligibleTruckType: 'Wrong truck type',
  eligibleTrailerLength: 'Trailer too long',
  eligibleCertifications: 'Missing required certifications',
  eligibleSchedule: 'Schedule conflict',
  eligibleMinRate: 'Below minimum rate per mile',
  eligibleMinValue: 'Below minimum load value',
  eligibleDeadhead: 'Exceeds max deadhead',
  isEligible: ''
}

/**
 * Renders a compact score indicator with a hover tooltip, using a thin Progress bar.
 * Eligible loads show an emerald bar; ineligible loads show an amber bar with a
 * tooltip explaining why.
 */
export function EligibilityBadge({
  flags,
  recommendationScore,
  className = '',
}: EligibilityBadgeProps) {
  const isEligible = flags.isEligible
  const score = Math.min(100, Math.max(0, recommendationScore))

  // Color classes — emerald for eligible, amber for ineligible
  const barColor = isEligible ? 'bg-emerald-500' : 'bg-amber-500'
  const textColor = isEligible
    ? 'text-emerald-600 dark:text-emerald-400'
    : 'text-amber-600 dark:text-amber-400'

  // Tooltip content for ineligible loads
  const tooltipContent = isEligible
    ? `Score: ${recommendationScore}/100`
    : (() => {
        const reasons: string[] = []
        const flagKeys = Object.keys(flags) as (keyof EligibilityFlags)[]
        for (const key of flagKeys) {
          if (key === 'isEligible') continue
          if (!flags[key]) {
            reasons.push(ELIGIBILITY_LABELS[key])
          }
        }
        if (reasons.length === 0) return 'Not fully eligible'
        return `Not fully eligible:\n${reasons.map((r) => `  • ${r}`).join('\n')}`
      })()

  return (
    <div className={`w-full group relative ${className}`}>
      <div className="flex items-center justify-between">
        <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${textColor}`}>
          {!isEligible && <AlertTriangle className="w-3 h-3" />}
          Recommendation Score
        </span>
        <span className={`text-[11px] font-medium tabular-nums ${textColor}`}>
          {recommendationScore}/100
        </span>
      </div>
      <Progress value={score} className="h-1 mt-0.5" indicatorClassName={barColor} />

      {/* Tooltip on hover — appears above the badge */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 w-max max-w-[220px] rounded-md border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg whitespace-pre-line">
        {isEligible ? `Score: ${recommendationScore}/100` : tooltipContent}
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-popover" />
      </div>
    </div>
  )
}