import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import DrawerShell from '@/components/layout/DrawerShell'
import { Field, FieldLabel } from '@/components/ui/field'
import type {
  ExpensePreferences,
  Truck,
  TruckExpensePreferences,
} from '@/services/driverApi/driverEnum'
import { cn } from '@/lib/utils'

// Fields shown for the global (driver-level) defaults. Insurance is per-truck only.
const globalExpenseFields: {
  key: keyof ExpensePreferences
  label: string
  suffix: string
  step: number
  isMonetary?: boolean
}[] = [
  { key: 'fuelCostPerLiter', label: 'Fuel Cost', suffix: 'per L', step: 0.01, isMonetary: true },
  { key: 'fuelEfficiencyKmPerLiter', label: 'Fuel Efficiency', suffix: 'km/L', step: 0.1 },
  { key: 'maintenancePerKm', label: 'Maintenance', suffix: 'per km', step: 0.01, isMonetary: true },
  {
    key: 'otherFixedCostsPerMonth',
    label: 'Other Fixed Costs',
    suffix: '/month',
    step: 1,
    isMonetary: true,
  },
]

// Fields shown for a specific truck (includes insurance).
const truckExpenseFields: {
  key: keyof TruckExpensePreferences
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

function truckDisplayName(t: Truck) {
  return `${t.year} ${t.make} ${t.model} (${t.trailerLengthFt}ft)`
}

export function GlobalExpenseDrawer({
  open,
  onOpenChange,
  localExpenses,
  onSave,
  isSaving,
  trucks = [],
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  localExpenses: ExpensePreferences | null
  // Returns { form, scope } where scope is 'global' or a truck id
  onSave: (form: ExpensePreferences, scope: string) => void
  isSaving: boolean
  trucks?: Truck[]
}) {
  // 'global' or a truck id
  const [scope, setScope] = useState<string>('global')
  const [globalForm, setGlobalForm] = useState<ExpensePreferences | null>(null)
  const [truckForms, setTruckForms] = useState<Record<string, TruckExpensePreferences>>({})

  // Initialize forms when the drawer opens
  useEffect(() => {
    if (open && localExpenses) {
      setGlobalForm(localExpenses)
      setScope('global')
    }
  }, [open, localExpenses])

  // Initialize a truck's form the first time it's selected
  const activeTruckForm = useMemo(() => {
    if (scope === 'global') return null
    const t = trucks.find((x) => x._id === scope)
    if (!t) return null
    return (
      truckForms[scope] ?? {
        fuelCostPerLiter: t.expensePreferences?.fuelCostPerLiter ?? null,
        fuelEfficiencyKmPerLiter: t.expensePreferences?.fuelEfficiencyKmPerLiter ?? null,
        insurancePerMonth: t.expensePreferences?.insurancePerMonth ?? 0,
        maintenancePerKm: t.expensePreferences?.maintenancePerKm ?? null,
        otherFixedCostsPerMonth: t.expensePreferences?.otherFixedCostsPerMonth ?? null,
      }
    )
  }, [scope, trucks, truckForms])

  const isGlobal = scope === 'global'
  const fields = isGlobal ? globalExpenseFields : truckExpenseFields

  // Fully initialize a truck's form the moment it is selected so that later
  // edits only change the specific field being edited (they spread the
  // already-populated object instead of starting from undefined).
  const handleScopeChange = useCallback(
    (next: string) => {
      setScope(next)
      if (next === 'global') return
      setTruckForms((prev) => {
        if (prev[next]) return prev
        const t = trucks.find((x) => x._id === next)
        if (!t) return prev
        return {
          ...prev,
          [next]: {
            fuelCostPerLiter: t.expensePreferences?.fuelCostPerLiter ?? null,
            fuelEfficiencyKmPerLiter: t.expensePreferences?.fuelEfficiencyKmPerLiter ?? null,
            insurancePerMonth: t.expensePreferences?.insurancePerMonth ?? 0,
            maintenancePerKm: t.expensePreferences?.maintenancePerKm ?? null,
            otherFixedCostsPerMonth: t.expensePreferences?.otherFixedCostsPerMonth ?? null,
          },
        }
      })
    },
    [trucks]
  )

  const handleChange = useCallback(
    (key: string, value: string) => {
      const num = parseFloat(value) || 0
      if (isGlobal) {
        setGlobalForm((prev) => (prev ? { ...prev, [key]: num } : prev))
      } else {
        setTruckForms((prev) => ({
          ...prev,
          [scope]: { ...(prev[scope] as TruckExpensePreferences), [key]: num },
        }))
      }
    },
    [isGlobal, scope]
  )

  const handleSave = useCallback(() => {
    if (isGlobal) {
      if (globalForm) onSave(globalForm, scope)
    } else if (activeTruckForm) {
      onSave(activeTruckForm as unknown as ExpensePreferences, scope)
    }
  }, [isGlobal, scope, globalForm, activeTruckForm, onSave])

  return (
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
      title="Expense Preferences"
      description="Configure your default cost estimates. These are used to calculate per-load profit. You can override them for individual loads, or set them per truck."
      size="lg"
      drawerSubmit={{
        onSubmit: handleSave,
        isSubmitting: isSaving,
        submitLabel: isSaving ? undefined : 'Save Expenses',
      }}
    >
      <div className="space-y-5">
        <Field>
          <FieldLabel>Apply to</FieldLabel>
          <Select value={scope} onValueChange={handleScopeChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select scope" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="global">Global Defaults</SelectItem>
              {trucks.map((t) => (
                <SelectItem key={t._id} value={t._id}>
                  {truckDisplayName(t)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        {fields.map(({ key, label, suffix, step, isMonetary }) => {
          const value = isGlobal
            ? (globalForm?.[key as keyof ExpensePreferences] ?? '')
            : (activeTruckForm?.[key as keyof TruckExpensePreferences] ?? '')
          return (
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
                  value={value === null || value === undefined ? '' : value}
                  onChange={(e) => handleChange(key, e.target.value)}
                  className={cn(isMonetary && 'pl-7')}
                />
              </div>
            </Field>
          )
        })}
      </div>
    </DrawerShell>
  )
}
