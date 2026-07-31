import { Input } from '@/components/ui/input'
import DrawerShell from '@/components/layout/DrawerShell'
import { InfoIconPopover } from '@/components/shared/InfoIconPopover'
import type { ScoreWeights } from '@/services/driverApi/driverEnum'
import { Slider } from '@/components/ui/slider'
import { useCallback, useEffect, useMemo, useState } from 'react'

interface ScoreWeightsDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  weights?: ScoreWeights
  onSave: (weights: ScoreWeights) => Promise<void>
}

const DEFAULT_WEIGHTS: ScoreWeights = {
  rate: 0.25,
  value: 0.1,
  deadhead: 0.2,
  geographicProximity: 0.2,
  temporalAdjacency: 0.15,
  truckTypeMatch: 0.05,
  competition: 0.05,
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
  value:
    'The total payout relative to your minimum load value. Higher values prioritize high-value loads.',
  deadhead:
    'Penalty for miles traveled to reach a load without a trailer. Lower values favor loads closer to your current location.',
  geographicProximity:
    'Distance-based score from your home location to the pickup. Higher values prioritize nearby loads.',
  temporalAdjacency:
    'Bonus when a load drops off near where another load picks up. Higher values favor scheduling efficiency.',
  truckTypeMatch:
    'Whether the load matches your truck type. Higher values strongly penalize mismatched types.',
  competition: 'Fewer existing bids = higher score. Higher values favor less competitive loads.',
}

export default function ScoreWeightsDrawer({
  open,
  onOpenChange,
  weights,
  onSave,
}: ScoreWeightsDrawerProps) {
  const [localWeights, setLocalWeights] = useState<ScoreWeights>(weights ?? DEFAULT_WEIGHTS)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Initialize local weights when drawer opens or weights change
  useEffect(() => {
    setLocalWeights({ ...DEFAULT_WEIGHTS, ...weights })
  }, [open, weights])

  // Calculate remaining budget for constraint logic
  const total = useMemo(
    () => Object.values(localWeights).reduce((sum, val) => sum + val, 0),
    [localWeights]
  )

  // Handle slider change with constraint enforcement
  const handleSliderChange = useCallback((key: keyof ScoreWeights, newValue: number[]) => {
    const newWeight = Math.round(newValue[0] * 100) / 100 // Round to 2 decimal places

    setLocalWeights((prev) => {
      const currentTotal = Object.values(prev).reduce((sum, val) => sum + val, 0)

      // Calculate remaining budget after this change
      const remainingBudget = 1.0 - (currentTotal - prev[key])

      if (remainingBudget < 0) {
        // Total would exceed 1.0 - clamp to max allowed value
        const clampedValue = Math.min(1, prev[key] + remainingBudget)
        return { ...prev, [key]: clampedValue }
      }

      return { ...prev, [key]: newWeight }
    })
  }, [])

  // Handle input change with constraint enforcement
  const handleInputChange = useCallback((key: keyof ScoreWeights, valueStr: string) => {
    const value = parseFloat(valueStr) || 0
    setLocalWeights((prev) => {
      const currentTotal = Object.values(prev).reduce((sum, val) => sum + val, 0)
      const remainingBudget = 1.0 - (currentTotal - prev[key])

      // Clamp value to allowable maximum
      const clampedValue = Math.min(1, Math.max(0, Math.round(value * 100) / 100))
      const finalValue =
        remainingBudget >= 0 ? clampedValue : Math.min(clampedValue, prev[key] + remainingBudget)

      return { ...prev, [key]: finalValue }
    })
  }, [])

  const handleSubmit = useCallback(async () => {
    setError(null)

    // Normalize weights to ensure they sum to 1.0
    const sum = Object.values(localWeights).reduce((a, b) => a + b, 0)
    const normalizedWeights = { ...localWeights }

    // If total is not 1.0, proportionally scale the weights
    if (sum !== 1.0) {
      const scaleFactor = 1 / sum
      for (const key of Object.keys(normalizedWeights) as (keyof ScoreWeights)[]) {
        normalizedWeights[key] = Math.round(normalizedWeights[key] * scaleFactor * 100) / 100
      }
    }

    setIsSubmitting(true)
    try {
      await onSave(normalizedWeights)
      onOpenChange(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save changes'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }, [localWeights, onSave, onOpenChange])

  let totalColor = 'text-destructive'
  if (total === 1.0) {
    totalColor = 'text-green-600'
  } else if (total < 1.0) {
    totalColor = 'text-amber-600'
  }

  return (
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
      title="Recommendation Weights"
      description="Adjust how loads are scored for your recommendations. All weights must sum to 100%."
      size="md"
      drawerSubmit={{
        onSubmit: handleSubmit,
        isSubmitting,
        submitLabel: 'Save',
        cancelLabel: 'Cancel',
      }}
    >
      {error && (
        <p className="text-xs text-destructive bg-destructive/10 rounded px-2 py-1 mb-3">{error}</p>
      )}

      <div className="space-y-4">
        {Object.entries(weightLabels).map(([key, label]) => {
          const currentValue = localWeights[key as keyof ScoreWeights]
          const otherTotal = Object.entries(localWeights)
            .filter(([k]) => k !== key)
            .reduce((sum, [, val]) => sum + val, 0)
          const maxAllowed = Math.round((1 - otherTotal) * 100) / 100
          const description = weightDescriptions[key as keyof ScoreWeights]

          return (
            <div key={key} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <label className="text-sm font-medium">{label}</label>
                  <InfoIconPopover
                    title={label}
                    description={description}
                    iconClassName="w-3.5 h-3.5 cursor-help"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={currentValue}
                    onChange={(e) => handleInputChange(key as keyof ScoreWeights, e.target.value)}
                    onBlur={(e) => handleInputChange(key as keyof ScoreWeights, e.target.value)}
                    min={0}
                    max={1}
                    step={0.01}
                    className="w-20 h-8 text-right text-sm"
                  />
                  <span className="text-sm text-muted-foreground">
                    {(currentValue * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
              <Slider
                value={[currentValue]}
                onValueChange={([val]) => handleSliderChange(key as keyof ScoreWeights, [val])}
                min={0}
                max={maxAllowed}
                step={0.01}
                className="w-full"
              />
            </div>
          )
        })}

        <div className="flex items-center justify-between border-t pt-3">
          <span className="text-sm font-medium">Total</span>
          <span className={`text-sm font-semibold ${totalColor}`}>
            {(total * 100).toFixed(1)}% / 100%
          </span>
        </div>
      </div>
    </DrawerShell>
  )
}
