import { useEffect, useState } from 'react'
import { useUpdateLoadExpensesMutation } from '@/services/loadApi/loadSlice'
import type { LoadRevenue, ExpenseOverrideFields } from '@/services/driverApi/driverEnum'
import { FieldLabel, FieldDescription } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export interface DrawerExpenseFormProps {
  load: LoadRevenue
  onClose: () => void
}

export function DrawerExpenseForm({ load, onClose }: DrawerExpenseFormProps) {
  const [updateExpenses, { isLoading }] = useUpdateLoadExpensesMutation()
  const [form, setForm] = useState<ExpenseOverrideFields>({})

  useEffect(() => {
    setForm({
      fuelCostPerLiter: load.effectiveFuelCostPerLiter ?? null,
      fuelEfficiencyKmPerLiter: load.effectiveFuelEfficiencyKmPerLiter ?? null,
      maintenancePerKm: load.effectiveMaintenancePerKm ?? null,
    })
  }, [load])

  const handleChange = (key: keyof ExpenseOverrideFields, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value === '' ? null : parseFloat(value) || 0 }))
  }

  const handleClear = async () => {
    const result = await updateExpenses({
      loadId: load.loadId,
      body: { fuelCostPerLiter: null, fuelEfficiencyKmPerLiter: null, maintenancePerKm: null },
    })
    if (result.error) {
      console.error('Failed to clear overrides:', result.error)
    }
    onClose()
  }

  const handleSave = async () => {
    const result = await updateExpenses({ loadId: load.loadId, body: form })
    if (result.error) {
      console.error('Failed to save overrides:', result.error)
    }
    onClose()
  }

  return (
    <div className="space-y-4 pt-4 border-t">
      <p className="text-sm font-medium">Override Load Expenses</p>
      <p className="text-xs text-muted-foreground">
        Set custom expense assumptions for this specific load. Leave empty to use global defaults.
      </p>
      <div className="space-y-3">
        <div>
          <FieldLabel className="text-xs font-medium text-muted-foreground block mb-1">
            Fuel Cost (per L)
          </FieldLabel>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              $
            </span>
            <Input
              type="number"
              step={0.01}
              min={0}
              placeholder="Use global default"
              value={form.fuelCostPerLiter ?? ''}
              onChange={(e) => handleChange('fuelCostPerLiter', e.target.value)}
              className="pl-7 w-full"
            />
          </div>
          <FieldDescription>Dollar amount</FieldDescription>
        </div>
        <div>
          <FieldLabel className="text-xs font-medium text-muted-foreground block mb-1">
            Fuel Efficiency (km/L)
          </FieldLabel>
          <Input
            type="number"
            step={0.1}
            min={0}
            placeholder="Leave blank to use your global default"
            value={form.fuelEfficiencyKmPerLiter ?? ''}
            onChange={(e) => handleChange('fuelEfficiencyKmPerLiter', e.target.value)}
            className="w-full"
          />
          <FieldDescription>Leave blank to use your global default</FieldDescription>
        </div>
        <div>
          <FieldLabel className="text-xs font-medium text-muted-foreground block mb-1">
            Maintenance (per km)
          </FieldLabel>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              $
            </span>
            <Input
              type="number"
              step={0.01}
              min={0}
              placeholder="Use global default"
              value={form.maintenancePerKm ?? ''}
              onChange={(e) => handleChange('maintenancePerKm', e.target.value)}
              className="pl-7 w-full"
            />
          </div>
          <FieldDescription>Dollar amount</FieldDescription>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={handleClear} disabled={isLoading}>
          Clear Overrides
        </Button>
        <Button onClick={handleSave} disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  )
}
