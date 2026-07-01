import DynamicCard from '@/components/layout/DynamicCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatMoney } from '@/lib/format'
import type { DriverProfile } from '@/services/driverApi/driverEnum'
import { Check, DollarSign, Gauge, Loader2, Route, X } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

import EditPencilButton from '@/components/shared/EditPencilButton'

interface PricingPreferencesCardProps {
  driver: DriverProfile
  onSave: (values: PricingFormValues) => Promise<void>
}

export interface PricingFormValues {
  minimumRatePerMile: number
  minimumLoadValue: number
  preferredMaxDeadheadMiles: number
}

export default function PricingPreferencesCard({ driver, onSave }: PricingPreferencesCardProps) {
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<PricingFormValues>({
    defaultValues: {
      minimumRatePerMile: driver.pricingPreferences.minimumRatePerMile,
      minimumLoadValue: driver.pricingPreferences.minimumLoadValue,
      preferredMaxDeadheadMiles: driver.pricingPreferences.preferredMaxDeadheadMiles,
    },
  })

  const onSubmit = async (values: PricingFormValues) => {
    setError(null)
    try {
      await onSave(values)
      setEditing(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save changes'
      setError(message)
    }
  }

  const inputCls = 'bg-background border-border placeholder:text-muted-foreground/50 h-8 text-sm'

  if (editing) {
    return (
      <DynamicCard
        title="Pricing Preferences"
        action={
          <button
            onClick={() => {
              setError(null)
              setEditing(false)
            }}
            className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title="Cancel"
          >
            <X className="h-4 w-4" />
          </button>
        }
      >
        {error && (
          <p className="text-xs text-destructive bg-destructive/10 rounded px-2 py-1 mx-4 mt-3">
            {error}
          </p>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <p className="text-xs text-muted-foreground">Min Rate / Mile</p>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                <Input
                  className={`${inputCls} pl-6`}
                  type="number"
                  step="0.01"
                  min="0"
                  {...register('minimumRatePerMile', { valueAsNumber: true, min: 0 })}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-xs text-muted-foreground">Min Load Value</p>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                <Input
                  className={`${inputCls} pl-6`}
                  type="number"
                  step="0.01"
                  min="0"
                  {...register('minimumLoadValue', { valueAsNumber: true, min: 0 })}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-xs text-muted-foreground">Max Deadhead</p>
              <Input
                className={inputCls}
                type="number"
                min="0"
                placeholder="mi"
                {...register('preferredMaxDeadheadMiles', { valueAsNumber: true, min: 0 })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditing(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              Save
            </Button>
          </div>
        </form>
      </DynamicCard>
    )
  }

  return (
    <DynamicCard
      title="Pricing Preferences"
      action={
        <EditPencilButton
          onClick={() => setEditing(true)}
          ariaLabel="Edit pricing preferences"
          title="Edit"
        />
      }
    >
      <div className="grid grid-cols-3 gap-4">
        <div className="flex flex-col items-center gap-1 rounded-lg border p-3 text-center">
          <DollarSign className="h-5 w-5 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">Min Rate / Mile</p>
          <p className="text-sm font-semibold">
            {driver.pricingPreferences.minimumRatePerMile > 0
              ? `${formatMoney(driver.pricingPreferences.minimumRatePerMile)}/mi`
              : '—'}
          </p>
        </div>
        <div className="flex flex-col items-center gap-1 rounded-lg border p-3 text-center">
          <Gauge className="h-5 w-5 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">Min Load Value</p>
          <p className="text-sm font-semibold">
            {driver.pricingPreferences.minimumLoadValue > 0
              ? formatMoney(driver.pricingPreferences.minimumLoadValue)
              : '—'}
          </p>
        </div>
        <div className="flex flex-col items-center gap-1 rounded-lg border p-3 text-center">
          <Route className="h-5 w-5 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">Max Deadhead</p>
          <p className="text-sm font-semibold">
            {driver.pricingPreferences.preferredMaxDeadheadMiles > 0
              ? `${driver.pricingPreferences.preferredMaxDeadheadMiles} mi`
              : '—'}
          </p>
        </div>
      </div>
    </DynamicCard>
  )
}