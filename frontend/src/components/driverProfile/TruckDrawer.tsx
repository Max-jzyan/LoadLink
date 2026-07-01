import DrawerShell from '@/components/layout/DrawerShell'
import { Button } from '@/components/ui/button'
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import type { Truck } from '@/services/driverApi/driverEnum'
import { CERTIFICATION_OPTIONS, TRUCK_TYPES } from '@/types/enums'
import { Loader2 } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Controller, useForm } from 'react-hook-form'

export interface TruckFormValues {
  make: string
  model: string
  year: number
  truckType: string
  trailerLengthFt: number | undefined
  capacityLbs: number | undefined
  maxPayloadLbs: number | undefined
  plateNumber: string
  vin: string
  certifications: string[]
  isPrimary: boolean
  notes: string
}

interface TruckDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Existing truck to edit, or null for create mode */
  editTruck: Truck | null
  onSubmit: (values: TruckFormValues, truckId?: string) => Promise<void>
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-xs text-destructive mt-1">{message}</p>
}

export default function TruckDrawer({
  open,
  onOpenChange,
  editTruck,
  onSubmit,
}: TruckDrawerProps) {
  const formId = 'truck-form'

  const isEdit = !!editTruck
  const certAnchor = useRef<HTMLDivElement | null>(null)
  const previousEditTruckId = useRef<string | null>(null)

  // Force remount of the form when switching modes (edit <-> create)
  // to guarantee RHF state is fully cleared.
  const formKey = `${open ? 'open' : 'closed'}:${editTruck?._id ?? 'create'}`
  const { register, handleSubmit, control, reset, formState } =
    useForm<TruckFormValues>({
    defaultValues: {
      make: '',
      model: '',
      year: new Date().getFullYear(),
      truckType: '',
      trailerLengthFt: undefined,
      capacityLbs: undefined,
      maxPayloadLbs: undefined,
      plateNumber: '',
      vin: '',
      certifications: [],
      isPrimary: false,
      notes: '',
    },
  })

  // Reset form when drawer closes; and when switching between different editTruck items.
  useEffect(() => {
    const defaultValues: TruckFormValues = {
      make: '',
      model: '',
      year: new Date().getFullYear(),
      truckType: '',
      trailerLengthFt: undefined,
      capacityLbs: undefined,
      maxPayloadLbs: undefined,
      plateNumber: '',
      vin: '',
      certifications: [],
      isPrimary: false,
      notes: '',
    }

    if (!open) {
      reset(defaultValues)
      previousEditTruckId.current = null
      return
    }

    // Explicit create-mode reset (prevents stale Truck123 values after editing + closing)
    if (!editTruck) {
      reset(defaultValues)
      previousEditTruckId.current = null
      return
    }

    const editTruckId = editTruck._id
    // Reset only when switching to a different truck OR entering edit mode.
    if (previousEditTruckId.current === editTruckId) return
    previousEditTruckId.current = editTruckId

    reset({
      make: editTruck.make,
      model: editTruck.model,
      year: editTruck.year,
      truckType: editTruck.truckType,
      trailerLengthFt: editTruck.trailerLengthFt,
      capacityLbs: editTruck.capacityLbs,
      maxPayloadLbs: editTruck.maxPayloadLbs || 0,
      plateNumber: editTruck.plateNumber,
      vin: editTruck.vin || '',
      certifications: editTruck.certifications || [],
      isPrimary: editTruck.isPrimary,
      notes: editTruck.notes || '',
    })
  }, [open, editTruck, reset])

  const { errors, isSubmitting } = formState

  const onFormSubmit = async (values: TruckFormValues) => {
    await onSubmit(values, editTruck?._id)
  }

  const inputCls = 'bg-background border-border placeholder:text-muted-foreground/50'

  const getButtonContent = () => {
    if (isSubmitting) {
      return (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Saving...
        </>
      )
    }
    return isEdit ? 'Save Changes' : 'Add Truck'
  }

  return (
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? 'Edit Truck' : 'Add New Truck'}
      description={isEdit ? 'Update the details of your truck.' : 'Register a new truck to your fleet.'}
      size="lg"
      footer={
        <>
          <Button type="submit" size="lg" disabled={isSubmitting} form={formId}>
            {getButtonContent()}
          </Button>
          <Button
            variant="outline"
            size="lg"
            disabled={isSubmitting}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
        </>
      }
    >
      <form key={formKey} id={formId} onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
        {/* Make & Model */}
        <div className="grid grid-cols-2 gap-3">
          <Field>
            <FieldLabel>Make</FieldLabel>
            <Input
              className={inputCls}
              placeholder="e.g. Kenworth"
              {...register('make', { required: 'Make is required' })}
            />
            <FieldError message={errors.make?.message} />
          </Field>
          <Field>
            <FieldLabel>Model</FieldLabel>
            <Input
              className={inputCls}
              placeholder="e.g. T680"
              {...register('model', { required: 'Model is required' })}
            />
            <FieldError message={errors.model?.message} />
          </Field>
        </div>

        {/* Year & Truck Type */}
        <div className="grid grid-cols-2 gap-3">
          <Field>
            <FieldLabel>Year</FieldLabel>
            <Input
              className={inputCls}
              type="number"
              min={1900}
              max={2100}
              {...register('year', {
                required: 'Year is required',
                min: { value: 1900, message: 'Invalid year' },
                max: { value: 2100, message: 'Invalid year' },
                valueAsNumber: true,
              })}
            />
            <FieldError message={errors.year?.message} />
          </Field>
          <Field>
            <FieldLabel>Truck Type</FieldLabel>
            <Controller
              control={control}
              name="truckType"
              rules={{ required: 'Truck type is required' }}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="bg-background border-border w-full">
                    <SelectValue placeholder="Select type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {TRUCK_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError message={errors.truckType?.message} />
          </Field>
        </div>

        {/* Trailer Length & Capacity */}
        <div className="grid grid-cols-2 gap-3">
          <Field>
            <FieldLabel>Trailer Length (ft)</FieldLabel>
            <Input
              className={inputCls}
              type="number"
              min={1}
              placeholder="53"
              {...register('trailerLengthFt', {
                required: 'Trailer length is required',
                min: { value: 1, message: 'Must be > 0' },
                valueAsNumber: true,
              })}
            />
            <FieldError message={errors.trailerLengthFt?.message} />
          </Field>
          <Field>
            <FieldLabel>Capacity (lbs)</FieldLabel>
            <Input
              className={inputCls}
              type="number"
              min={0}
              placeholder="45,000"
              {...register('capacityLbs', {
                required: 'Capacity is required',
                min: { value: 0, message: 'Must be >= 0' },
                valueAsNumber: true,
              })}
            />
            <FieldError message={errors.capacityLbs?.message} />
          </Field>
        </div>

        {/* Max Payload & Plate Number */}
        <div className="grid grid-cols-2 gap-3">
          <Field>
            <FieldLabel>Max Payload (lbs)</FieldLabel>
            <Input
              className={inputCls}
              type="number"
              placeholder="44,000"
              min={0}
              {...register('maxPayloadLbs', {
                valueAsNumber: true,
                min: { value: 0, message: 'Must be >= 0' },
              })}
            />
          </Field>
          <Field>
            <FieldLabel>Plate Number</FieldLabel>
            <Input
              className={inputCls}
              placeholder="e.g. ABC-1234"
              {...register('plateNumber', { required: 'Plate number is required' })}
            />
            <FieldError message={errors.plateNumber?.message} />
          </Field>
        </div>

        {/* VIN */}
        <Field>
          <FieldLabel>VIN</FieldLabel>
          <Input
            className={inputCls}
            placeholder="Vehicle Identification Number"
            {...register('vin')}
          />
        </Field>

        {/* Certifications */}
        <Field>
          <FieldLabel>Certifications</FieldLabel>
          <Controller
            control={control}
            name="certifications"
            render={({ field }) => (
              <div ref={certAnchor}>
                <Combobox
                  value={field.value}
                  onValueChange={(newValue: string[]) => {
                    field.onChange(newValue)
                  }}
                  multiple
                >
                  <ComboboxChips className="min-h-8">
                    {(field.value || []).map((cert: string) => (
                      <ComboboxChip key={cert}>
                        {CERTIFICATION_OPTIONS.find((c) => c.value === cert)?.label ?? cert}
                      </ComboboxChip>
                    ))}
                    <ComboboxChipsInput placeholder="Select certifications..." />
                  </ComboboxChips>
                  <ComboboxContent sideOffset={4} align="start" anchor={certAnchor}>
                    <ComboboxList>
                      {CERTIFICATION_OPTIONS.map((cert) => (
                        <ComboboxItem key={cert.value} value={cert.value}>
                          {cert.label}
                        </ComboboxItem>
                      ))}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              </div>
            )}
          />
          <FieldDescription>Optional certifications for this truck</FieldDescription>
        </Field>

        {/* Primary Truck Toggle */}
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium">Primary Truck</p>
            <p className="text-xs text-muted-foreground">Set as your primary/default truck</p>
          </div>
          <Controller
            control={control}
            name="isPrimary"
            render={({ field }) => (
              <Switch
                checked={field.value}
                onCheckedChange={field.onChange}
                className="data-unchecked:bg-muted data-unchecked:border-border"
              />
            )}
          />
        </div>

        {/* Notes */}
        <Field>
          <FieldLabel>Notes</FieldLabel>
          <Controller
            control={control}
            name="notes"
            render={({ field }) => (
              <Textarea
                className="resize-none bg-background border-border placeholder:text-muted-foreground/50"
                rows={3}
                placeholder="Optional notes about this truck..."
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </Field>
      </form>
    </DrawerShell>
  )
}
