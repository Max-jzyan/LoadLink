import { useState, useEffect } from 'react'
import { Progress } from '@/components/ui/progress'
import type {
  EligibilityFlags,
  EligibilitySeverity,
  EligibilityBadgeType,
} from '@/services/driverApi/driverEnum'
import { ELIGIBILITY_LABELS } from '@/services/driverApi/driverEnum'
import { AlertTriangle, Star } from 'lucide-react'
import { createPortal } from 'react-dom'

interface EligibilityBadgeProps {
  flags: EligibilityFlags
  recommendationScore: number
  severity?: EligibilitySeverity
  highScoreHighlights?: string[]
  className?: string
}

/**
 * Renders a compact score indicator with a hover tooltip, using a thin Progress bar.
 * Highlights exceptional loads (≥80) in green, eligible loads in emerald,
 * critical ineligible loads in red, and minor ineligible loads in amber.
 * Tooltip is rendered via portal to avoid clipping by parent containers.
 */
export function EligibilityBadge({
  flags,
  recommendationScore,
  severity = 'minor',
  highScoreHighlights,
  className = '',
}: EligibilityBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 })
  const badgeRef = useState<HTMLDivElement | null>(null)

  const isEligible = flags.isEligible
  const score = Math.min(100, Math.max(0, recommendationScore))

  const badgeState: EligibilityBadgeType = (() => {
    if (!isEligible) return 'ineligible'
    if (score >= 80) return 'high-score'
    return 'eligible'
  })()

  const isCritical = badgeState === 'ineligible' && severity === 'critical'

  // Color classes based on state
  const barColor = (() => {
    if (badgeState === 'high-score') return 'bg-green-500'
    if (badgeState === 'eligible') return 'bg-emerald-500'
    if (isCritical) return 'bg-red-500'
    return 'bg-amber-500'
  })()

  const textColor = (() => {
    if (badgeState === 'high-score') return 'text-green-600 dark:text-green-400'
    if (badgeState === 'eligible') return 'text-emerald-600 dark:text-emerald-400'
    if (isCritical) return 'text-red-600 dark:text-red-400'
    return 'text-amber-600 dark:text-amber-400'
  })()

  // Tooltip content
  const tooltipContent = (() => {
    if (badgeState === 'high-score' && highScoreHighlights && highScoreHighlights.length > 0) {
      return `Top pick (${recommendationScore}/100):\n${highScoreHighlights.map((h) => `  • ${h}`).join('\n')}`
    }
    if (isEligible) {
      return `Score: ${recommendationScore}/100`
    }
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

  // Update tooltip position when showing
  useEffect(() => {
    if (showTooltip && badgeRef[0]) {
      const rect = badgeRef[0].getBoundingClientRect()
      setTooltipPos({
        top: rect.top - 8, // 8px above the badge
        left: rect.left + rect.width / 2,
      })
    }
  }, [showTooltip])

  return (
    <div
      ref={(el) => {
        badgeRef[0] = el
      }}
      className={`w-full relative ${className}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="flex items-center justify-between">
        <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${textColor}`}>
          {badgeState === 'high-score' && <Star className="w-3 h-3 fill-current" />}
          {badgeState === 'ineligible' && isCritical && (
            <AlertTriangle className="w-3 h-3 text-red-500" />
          )}
          {badgeState === 'ineligible' && !isCritical && <AlertTriangle className="w-3 h-3" />}
          Your Score
        </span>
        <span className={`text-[11px] font-medium tabular-nums ${textColor}`}>
          {recommendationScore}/100
        </span>
      </div>
      <Progress value={score} className="h-1 mt-0.5" indicatorClassName={barColor} />

      {showTooltip &&
        createPortal(
          <div
            className="fixed z-[9999] w-max max-w-[220px] -translate-x-1/2 rounded-md border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg whitespace-pre-line"
            style={{
              top: `${tooltipPos.top}px`,
              left: `${tooltipPos.left}px`,
              transform: 'translate(-50%, -100%)', // Center horizontally and place above
            }}
            role="tooltip"
          >
            {tooltipContent}
            <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-popover" />
          </div>,
          document.body
        )}
    </div>
  )
}
