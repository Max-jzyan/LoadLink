import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import DrawerShell from '@/components/layout/DrawerShell'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import type { Trailer, CreateTrailerPayload } from '@/services/driverApi/driverEnum'
import { TRUCK_TYPES } from '@/types/enums'
export type TrailerFormValues = CreateTrailerPayload

interface TrailerDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editTrailer: Trailer | null
  isLoading?: boolean
  onSubmit: (values: TrailerFormValues, trailerId?: string) => void
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-xs text-destructive mt-1">{message}</p>
}

export default function TrailerDrawer({
  open,
  onOpenChange,
  editTrailer,
  isLoading = false,
  onSubmit,
}: TrailerDrawerProps) {
  const formId = 'trailer-form'
  const isEdit = !!editTrailer
  const formKey = `${open ? 'open' : 'closed'}:${editTrailer?._id ?? 'create'}`

  const inputCls = 'bg-background border-border placeholder:text-muted-foreground/50'

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isLoading: formLoading },
  } = useForm<TrailerFormValues>({
    defaultValues: {
      plateNumber: '',
      trailerType: '',
      lengthFt: undefined as unknown as number,
      unitNumber: '',
      vin: '',
      capacityLbs: undefined,
      year: undefined,
      make: '',
      notes: '',
      isPrimary: false,
    },
  })

  useEffect(() => {
    if (!open) {
      reset({
        plateNumber: '',
        trailerType: '',
        lengthFt: undefined as unknown as number,
        unitNumber: '',
        vin: '',
        capacityLbs: undefined,
        year: undefined,
        make: '',
        notes: '',
        isPrimary: false,
      })
      return
    }
    if (editTrailer) {
      reset({
        plateNumber: editTrailer.plateNumber,
        trailerType: editTrailer.trailerType,
        lengthFt: editTrailer.lengthFt,
        unitNumber: editTrailer.unitNumber || '',
        vin: editTrailer.vin || '',
        capacityLbs: editTrailer.capacityLbs || undefined,
        year: editTrailer.year ?? undefined,
        make: editTrailer.make || '',
        notes: editTrailer.notes || '',
        isPrimary: editTrailer.isPrimary ?? false,
      })
    }
  }, [open, editTrailer, reset])

  const onFormSubmit = (values: TrailerFormValues) => {
    onSubmit(values, editTrailer?._id)
  }

  return (
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? 'Edit Trailer' : 'Add Trailer'}
      description={isEdit ? 'Update the trailer details.' : 'Register a new trailer to your fleet.'}
      size="md"
      drawerSubmit={{
        onSubmit: handleSubmit(onFormSubmit),
        isSubmitting: formLoading,
        submitLabel: formLoading ? undefined : isEdit ? 'Save Changes' : 'Add Trailer',
      }}
    >
      <form key={formKey} id={formId} onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
        {/* Trailer Type */}
        <Field>
          <FieldLabel>Trailer Type</FieldLabel>
          <Controller
            control={control}
            name="trailerType"
            rules={{ required: 'Trailer type is required' }}
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
          <FieldError message={errors.trailerType?.message} />
        </Field>

        {/* Length & Plate */}
        <div className="grid grid-cols-2 gap-3">
          <Field>
            <FieldLabel>Length (ft)</FieldLabel>
            <Input
              className={inputCls}
              type="number"
              min={1}
              placeholder="53"
              {...register('lengthFt', {
                required: 'Length is required',
                min: { value: 1, message: 'Must be > 0' },
                valueAsNumber: true,
              })}
            />
            <FieldError message={errors.lengthFt?.message} />
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

        {/* Unit # & VIN */}
        <div className="grid grid-cols-2 gap-3">
          <Field>
            <FieldLabel>Unit # (optional)</FieldLabel>
            <Input className={inputCls} placeholder="e.g. TR-045" {...register('unitNumber')} />
            <FieldDescription>Internal fleet identifier</FieldDescription>
          </Field>
          <Field>
            <FieldLabel>VIN (optional)</FieldLabel>
            <Input className={inputCls} placeholder="Vehicle ID Number" {...register('vin')} />
          </Field>
        </div>

        {/* Year & Make */}
        <div className="grid grid-cols-2 gap-3">
          <Field>
            <FieldLabel>Year (optional)</FieldLabel>
            <Input
              className={inputCls}
              type="number"
              min={1900}
              max={2100}
              placeholder={String(new Date().getFullYear())}
              {...register('year', {
                valueAsNumber: true,
                min: { value: 1900, message: 'Invalid year' },
                max: { value: 2100, message: 'Invalid year' },
              })}
            />
          </Field>
          <Field>
            <FieldLabel>Make (optional)</FieldLabel>
            <Input className={inputCls} placeholder="e.g. Wabash" {...register('make')} />
          </Field>
        </div>

        {/* Capacity */}
        <Field>
          <FieldLabel>Max Capacity (lbs, optional)</FieldLabel>
          <Input
            className={inputCls}
            type="number"
            min={0}
            placeholder="45,000"
            {...register('capacityLbs', { valueAsNumber: true, min: 0 })}
          />
        </Field>

        {/* Primary Trailer */}
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium">Primary Trailer</p>
            <p className="text-xs text-muted-foreground">Set as your primary/default trailer</p>
          </div>
          <Controller
            control={control}
            name="isPrimary"
            render={({ field }) => (
              <Switch
                checked={field.value ?? false}
                onCheckedChange={field.onChange}
                className="data-unchecked:bg-muted data-unchecked:border-border"
              />
            )}
          />
        </div>

        {/* Notes */}
        <Field>
          <FieldLabel>Notes (optional)</FieldLabel>
          <Controller
            control={control}
            name="notes"
            render={({ field }) => (
              <Textarea
                className="resize-none bg-background border-border placeholder:text-muted-foreground/50"
                rows={3}
                placeholder="Optional notes about this trailer…"
                value={field.value ?? ''}
                onChange={field.onChange}
              />
            )}
          />
        </Field>
      </form>
    </DrawerShell>
  )
}
