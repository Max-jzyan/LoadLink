import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import DrawerShell from '@/components/layout/DrawerShell'
import { Field, FieldLabel } from '@/components/ui/field'
import type { ExpensePreferences } from '@/services/driverApi/driverEnum'
import { cn } from '@/lib/utils'

const globalExpenseFields: {
  key: keyof ExpensePreferences
  label: string
  suffix: string
  step: number
  isMonetary?: boolean
}[] = [
  { key: 'fuelCostPerLiter', label: 'Fuel Cost', suffix: 'per L', step: 0.01, isMonetary: true },
  { key: 'fuelEfficiencyKmPerLiter', label: 'Fuel Efficiency', suffix: 'km/L', step: 0.1 },
  { key: 'insurancePerMonth', label: 'Insurance', suffix: '/month', step: 1, isMonetary: true },
  { key: 'maintenancePerKm', label: 'Maintenance', suffix: 'per km', step: 0.01, isMonetary: true },
  {
    key: 'otherFixedCostsPerMonth',
    label: 'Other Fixed Costs',
    suffix: '/month',
    step: 1,
    isMonetary: true,
  },
]

export function GlobalExpenseDrawer({
  open,
  onOpenChange,
  localExpenses,
  onSave,
  isSaving,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  localExpenses: ExpensePreferences | null
  onSave: (form: ExpensePreferences) => void
  isSaving: boolean
}) {
  const [form, setForm] = useState<ExpensePreferences | null>(null)

  useEffect(() => {
    if (open && localExpenses) {
      setForm(localExpenses)
    }
  }, [open, localExpenses])

  const handleChange = useCallback((key: keyof ExpensePreferences, value: string) => {
    setForm((prev) => (prev ? { ...prev, [key]: parseFloat(value) || 0 } : prev))
  }, [])

  if (!form) return null

  return (
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
      title="Expense Preferences"
      description="Configure your default cost estimates. These are used to calculate per-load profit. You can override them for individual loads."
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => onSave(form)} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Expenses'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {globalExpenseFields.map(({ key, label, suffix, step, isMonetary }) => (
          <Field key={key}>
            <FieldLabel>
              {label} ({suffix})
            </FieldLabel>
            <div className="relative">
              {isMonetary && (
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
              )}
              <Input
                type="number"
                step={step}
                min={0}
                value={form[key] ?? ''}
                onChange={(e) => handleChange(key, e.target.value)}
                className={cn(isMonetary && 'pl-7')}
              />
            </div>
          </Field>
        ))}
      </div>
    </DrawerShell>
  )
}
