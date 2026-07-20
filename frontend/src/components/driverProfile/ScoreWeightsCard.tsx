import DynamicCard from '@/components/layout/DynamicCard'
import { InfoIconPopover } from '@/components/shared/InfoIconPopover'
import type { DriverProfile, ScoreWeights } from '@/services/driverApi/driverEnum'
import { useMemo } from 'react'

import EditPencilButton from '@/components/shared/EditPencilButton'

interface ScoreWeightsCardProps {
  driver: DriverProfile
  onEdit: () => void
}

const weightLabels: Record<keyof ScoreWeights, string> = {
  rate: 'Rate Score',
  value: 'Value Score',
  deadhead: 'Deadhead Score',
  geographicProximity: 'Geographic Proximity',
  temporalAdjacency: 'Temporal Adjacency',
  truckTypeMatch: 'Truck Type Match',
  competition: 'Competition',
}

const weightDescriptions: Record<keyof ScoreWeights, string> = {
  rate: 'How much the effective rate ($/mile) exceeds your minimum. Higher values prioritize loads paying above your threshold.',
  value: 'The total payout relative to your minimum load value. Higher values prioritize high-value loads.',
  deadhead: 'Penalty for miles traveled to reach a load without a trailer. Lower values favor loads closer to your current location.',
  geographicProximity: 'Distance-based score from your home location to the pickup. Higher values prioritize nearby loads.',
  temporalAdjacency: 'Bonus when a load drops off near where another load picks up. Higher values favor scheduling efficiency.',
  truckTypeMatch: 'Whether the load matches your truck type. Higher values strongly penalize mismatched types.',
  competition: 'Fewer existing bids = higher score. Higher values favor less competitive loads.',
}

export default function ScoreWeightsCard({ driver, onEdit }: ScoreWeightsCardProps) {
  // Ensure all weights have defaults and compute total
  const weights = useMemo(() => driver.scoreWeights ?? {
    rate: 0.25,
    value: 0.1,
    deadhead: 0.2,
    geographicProximity: 0.2,
    temporalAdjacency: 0.15,
    truckTypeMatch: 0.05,
    competition: 0.05,
  }, [driver.scoreWeights])

  const total = useMemo(
    () => Object.values(weights).reduce((sum, val) => sum + (val ?? 0), 0),
    [weights]
  )

  return (
    <DynamicCard
      title="Recommendation Weights"
      action={
        <EditPencilButton onClick={onEdit} ariaLabel="Edit recommendation weights" title="Edit" />
      }
    >
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Customize how loads are scored for your recommendations. Sliders prevent the total from exceeding
          100%.
        </p>

        <div className="grid grid-cols-4 gap-2">
          {Object.entries(weightLabels).map(([key, label]) => {
            const value = weights[key as keyof ScoreWeights] ?? 0
            const description = weightDescriptions[key as keyof ScoreWeights]
            return (
              <div key={key} className="flex flex-col gap-1 rounded-lg border p-2">
                <div className="flex items-center gap-0.5">
                  <p className="text-xs text-muted-foreground leading-tight">{label}</p>
                  <InfoIconPopover title={label} description={description} iconClassName="w-3 h-3 cursor-help flex-shrink-0" />
                </div>
                <p className="text-sm font-semibold">{(value * 100).toFixed(1)}%</p>
              </div>
            )
          })}
        </div>

        <div className="flex items-center justify-between border-t pt-2">
          <span className="text-xs text-muted-foreground">Total</span>
          {(() => {
            let totalColorClass = 'text-destructive'
            if (total === 1.0) {
              totalColorClass = 'text-green-600'
            } else if (total < 1.0) {
              totalColorClass = 'text-amber-600'
            }
            return <span className={`text-sm font-semibold ${totalColorClass}`}>{(total * 100).toFixed(1)}% / 100%</span>
          })()}
        </div>
      </div>
    </DynamicCard>
  )
}