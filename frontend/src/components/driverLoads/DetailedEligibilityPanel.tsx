import { CheckCircle, XCircle, AlertTriangle, Star, Info } from 'lucide-react'
import type { EligibilityFlags, EligibilitySeverity } from '@/services/driverApi/driverEnum'

interface EligibilityIssue {
  key: string
  label: string
}

interface DetailedEligibilityPanelProps {
  flags: EligibilityFlags
  score: number
  severity?: EligibilitySeverity
  highlights?: string[]
}

const ELIGIBILITY_LABELS: Record<keyof EligibilityFlags, string> = {
  eligibleTruckType: 'Truck type matches',
  eligibleTrailerLength: 'Trailer length suitable',
  eligibleCertifications: 'Has required certifications',
  eligibleSchedule: 'No schedule conflict',
  eligibleMinRate: 'Meets minimum rate',
  eligibleMinValue: 'Meets minimum load value',
  eligibleDeadhead: 'Within max deadhead',
  isEligible: '',
}

export function DetailedEligibilityPanel({
  flags,
  score,
  severity = 'minor',
  highlights,
}: DetailedEligibilityPanelProps) {
  const isEligible = flags.isEligible
  const isHighScore = score >= 80

  // Determine theme colors
  const theme = (() => {
    if (!isEligible && severity === 'critical') return { border: 'border-red-500', bg: 'bg-red-50 dark:bg-red-950/20', text: 'text-red-700 dark:text-red-400', accent: 'bg-red-500' }
    if (!isEligible) return { border: 'border-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/20', text: 'text-amber-700 dark:text-amber-400', accent: 'bg-amber-500' }
    if (isHighScore) return { border: 'border-green-500', bg: 'bg-green-50 dark:bg-green-950/20', text: 'text-green-700 dark:text-green-400', accent: 'bg-green-500' }
    return { border: 'border-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/20', text: 'text-emerald-700 dark:text-emerald-400', accent: 'bg-emerald-500' }
  })()

  // Determine badge text
  let badgeText: string
  if (!isEligible && severity === 'critical') {
    badgeText = 'Critical Issues'
  } else if (!isEligible) {
    badgeText = 'Issues Found'
  } else if (isHighScore) {
    badgeText = 'Top Pick'
  } else {
    badgeText = 'Eligible'
  }

  // Separate critical issues (schedule, certs) from minor issues
  const criticalIssues = [
    !flags.eligibleSchedule && { key: 'eligibleSchedule', label: ELIGIBILITY_LABELS.eligibleSchedule },
    !flags.eligibleCertifications && { key: 'eligibleCertifications', label: ELIGIBILITY_LABELS.eligibleCertifications },
  ].filter((issue): issue is EligibilityIssue => Boolean(issue))

  const minorIssues = [
    !flags.eligibleTruckType && { key: 'eligibleTruckType', label: ELIGIBILITY_LABELS.eligibleTruckType },
    !flags.eligibleTrailerLength && { key: 'eligibleTrailerLength', label: ELIGIBILITY_LABELS.eligibleTrailerLength },
    !flags.eligibleMinRate && { key: 'eligibleMinRate', label: ELIGIBILITY_LABELS.eligibleMinRate },
    !flags.eligibleMinValue && { key: 'eligibleMinValue', label: ELIGIBILITY_LABELS.eligibleMinValue },
    !flags.eligibleDeadhead && { key: 'eligibleDeadhead', label: ELIGIBILITY_LABELS.eligibleDeadhead },
  ].filter((issue): issue is EligibilityIssue => Boolean(issue))

  return (
    <div className={`space-y-3 p-3 rounded-lg border ${theme.border} ${theme.bg}`}>
      {/* Score Display */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isHighScore && <Star className="w-5 h-5 fill-green-500 text-green-500" />}
          {!isEligible && severity === 'critical' && (
            <AlertTriangle className="w-5 h-5 text-red-500" />
          )}
          {!isEligible && severity !== 'critical' && (
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          )}
          <span className="text-sm font-semibold">Match Score</span>
        </div>
        <span className={`text-2xl font-bold tabular-nums ${theme.text}`}>
          {score}/100
        </span>
      </div>

      {/* Status Badge */}
      <div className="flex items-center gap-1.5">
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${theme.accent} text-white`}>
          {badgeText}
        </span>
        {isHighScore && (
          <span className="text-xs text-muted-foreground">Highly recommended</span>
        )}
      </div>

      {/* Critical Issues Section */}
      {criticalIssues.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-red-700 dark:text-red-400 uppercase tracking-wide">
            Critical Issues
          </p>
          {criticalIssues.map((issue) => (
            <div key={issue.key} className="flex items-start gap-2 text-sm">
              <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span className="text-red-800 dark:text-red-300">{issue.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Minor Issues Section */}
      {minorIssues.length > 0 && (
        <div className="space-y-1.5">
          {(criticalIssues.length > 0 || !isEligible) && (
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
              Other Issues
            </p>
          )}
          {minorIssues.map((issue) => (
            <div key={issue.key} className="flex items-start gap-2 text-sm">
              <XCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <span className="text-amber-800 dark:text-amber-300">{issue.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* All Clear / Highlights Section */}
      {isEligible && (
        <div className="space-y-1.5">
          {isHighScore && highlights && highlights.length > 0 ? (
            <>
              <p className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide flex items-center gap-1">
                <Star className="w-3 h-3 fill-current" />
                Why This is a Top Pick
              </p>
              <ul className="space-y-1">
                {highlights.map((highlight, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-green-800 dark:text-green-300">
                    <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="flex items-start gap-2 text-sm text-emerald-700 dark:text-emerald-400">
              <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>You meet all basic eligibility requirements</span>
            </div>
          )}
        </div>
      )}

      {/* Info note */}
      {isEligible && !isHighScore && (
        <div className="flex items-start gap-2 text-xs text-muted-foreground pt-2 border-t">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>Score above 80 indicates a particularly strong match based on rate, schedule, and location preferences.</span>
        </div>
      )}
    </div>
  )
}