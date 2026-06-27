import { type FieldError, Controller } from 'react-hook-form'
import { ArrowRight, MapPin, TrendingUp, Truck } from 'lucide-react'
import { useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Combobox,
  ComboboxChips,
  ComboboxChip,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
} from '@/components/ui/combobox'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { PriceInput } from '@/components/shared/PriceInput'
import { DatePicker } from '@/components/shared/DatePicker'
import { AddressField } from '@/components/shared/AddressField'
import { PriceInputVariant, TRUCK_TYPES, CERTIFICATION_OPTIONS } from '@/types/enums'
import { useLoadForm, type LoadFormValues } from '@/hooks/useLoadForm'

export type { LoadFormValues }

interface LoadFormProps {
  initialValues?: Partial<LoadFormValues>
  onSubmit: (values: LoadFormValues) => void
  isSubmitting?: boolean
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-xs text-destructive mt-1">{message}</p>
}

export function LoadForm({ initialValues, onSubmit, isSubmitting }: LoadFormProps) {
  const { register, control, setValue, trigger, values, summaryRows, onFormSubmit, errors } =
    useLoadForm(initialValues, onSubmit)
  const certAnchor = useRef<HTMLDivElement | null>(null)

  const inputCls = 'bg-background border-border placeholder:text-muted-foreground/50'

  return (
    <form
      onSubmit={onFormSubmit}
      className="grid w-full grid-cols-1 lg:grid-cols-[minmax(0,11fr)_minmax(0,5fr)]"
    >
      {/* Main form */}
      <div className="min-w-0 p-2">
        <div className="flex flex-col gap-6 p-4">
          {/* Truck & Load Details */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Truck size={16} className="text-primary" />
                Truck & Load Details
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                <Field>
                  <FieldLabel>Truck Size (ft)</FieldLabel>
                  <Input
                    className={inputCls}
                    type="number"
                    min="1"
                    placeholder="53"
                    {...register('truckSize', {
                      required: 'Truck size is required',
                      min: { value: 1, message: 'Must be greater than 0' },
                    })}
                  />
                  <FieldError message={errors.truckSize?.message} />
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Field>
                  <FieldLabel>Weight (lbs)</FieldLabel>
                  <Input
                    className={inputCls}
                    type="number"
                    placeholder="e.g. 40,000"
                    {...register('weightLbs', {
                      required: 'Weight is required',
                      min: { value: 1, message: 'Must be greater than 0' },
                    })}
                  />
                  <FieldError message={errors.weightLbs?.message} />
                </Field>
                <Field>
                  <FieldLabel>Commodity Type</FieldLabel>
                  <Input
                    className={inputCls}
                    placeholder="e.g. Frozen Produce, Steel Coils..."
                    {...register('commodity', { required: 'Commodity is required' })}
                  />
                  <FieldError message={errors.commodity?.message} />
                </Field>
                <Field>
                  <FieldLabel>Special Certifications</FieldLabel>
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
                            {field.value.map((cert: string) => (
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
                  <FieldDescription>
                    Select all relevant certifications for this load
                  </FieldDescription>
                </Field>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                  <p className="text-sm font-medium">Driver Assist Required</p>
                  <p className="text-sm text-muted-foreground">
                    Driver must help with loading/unloading at origin or destination
                  </p>
                </div>
                <Controller
                  control={control}
                  name="driverAssist"
                  render={({ field }) => (
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="data-unchecked:bg-muted data-unchecked:border-border"
                    />
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Route */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <MapPin size={16} className="text-primary" />
                Route
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                <div className="flex-1 min-w-0">
                  <AddressField
                    label="Origin"
                    placeholder="Enter origin address..."
                    onValueChange={(v) => setValue('originAddress', v, { shouldValidate: true })}
                    onSelect={(opt) =>
                      setValue(
                        'originCoords',
                        opt.lat != null && opt.lon != null ? { lat: opt.lat, lng: opt.lon } : null,
                        { shouldValidate: true }
                      )
                    }
                  />
                  <FieldError
                    message={
                      errors.originAddress?.message ??
                      (errors.originCoords as FieldError | undefined)?.message
                    }
                  />
                </div>
                <div className="hidden sm:flex pt-8 shrink-0">
                  <ArrowRight size={18} className="text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <AddressField
                    label="Destination"
                    placeholder="Enter destination address..."
                    onValueChange={(v) =>
                      setValue('destinationAddress', v, { shouldValidate: true })
                    }
                    onSelect={(opt) =>
                      setValue(
                        'destinationCoords',
                        opt.lat != null && opt.lon != null ? { lat: opt.lat, lng: opt.lon } : null,
                        { shouldValidate: true }
                      )
                    }
                  />
                  <FieldError
                    message={
                      errors.destinationAddress?.message ??
                      (errors.destinationCoords as FieldError | undefined)?.message
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <DatePicker
                    label="Pickup Date"
                    onDateTimeChange={(v) => {
                      setValue('pickupTime', v, { shouldValidate: true })
                      trigger('dropoffTime')
                    }}
                  />
                  <FieldError message={errors.pickupTime?.message} />
                </div>
                <div>
                  <DatePicker
                    label="Delivery Date"
                    onDateTimeChange={(v) => setValue('dropoffTime', v, { shouldValidate: true })}
                  />
                  <FieldError message={errors.dropoffTime?.message} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pricing & Auction Settings */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <TrendingUp size={16} className="text-primary" />
                Pricing & Auction Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <PriceInput
                    className={inputCls}
                    inputGroupClassName="border-border bg-background overflow-hidden"
                    label="Minimum Price (Start)"
                    variant={PriceInputVariant.AMOUNT}
                    placeholder="800"
                    description="Auction starts at this price"
                    {...register('minPrice', {
                      required: 'Min price is required',
                      min: { value: 0.01, message: 'Must be greater than 0' },
                    })}
                  />
                  <FieldError message={errors.minPrice?.message} />
                </div>
                <div>
                  <PriceInput
                    className={inputCls}
                    inputGroupClassName="border-border bg-background overflow-hidden"
                    label="Maximum Price (Cap)"
                    variant={PriceInputVariant.AMOUNT}
                    placeholder="1,000"
                    description="Auction ends at this price"
                    {...register('maxPrice', {
                      required: 'Max price is required',
                      min: { value: 0.01, message: 'Must be greater than 0' },
                      validate: (v) => {
                        const min = values.minPrice
                        return !min || !v || Number(v) >= Number(min) || 'Must be ≥ min price'
                      },
                    })}
                  />
                  <FieldError message={errors.maxPrice?.message} />
                </div>
                <div>
                  <PriceInput
                    className={inputCls}
                    inputGroupClassName="border-border bg-background overflow-hidden"
                    label="Escalation Rate"
                    variant={PriceInputVariant.ESCALATION}
                    placeholder="10"
                    description="How fast price auto-increases"
                    {...register('escalationRate', {
                      required: 'Escalation rate is required',
                      min: { value: 0.01, message: 'Must be greater than 0' },
                    })}
                  />
                  <FieldError message={errors.escalationRate?.message} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Field>
                  <FieldLabel>Auto-Accept Tolerance (%)</FieldLabel>
                  {(() => {
                    const { onChange, ...rest } = register('tolerance', {
                      min: { value: 0, message: 'Must be 0 or above' },
                      max: { value: 100, message: 'Must be 100 or below' },
                      validate: (v) =>
                        !v || !!values.trigger || 'Trigger hours required when tolerance is set',
                    })
                    return (
                      <Input
                        className={inputCls}
                        type="number"
                        placeholder="10"
                        onChange={(e) => {
                          onChange(e)
                          trigger('trigger')
                        }}
                        {...rest}
                      />
                    )
                  })()}
                  <FieldDescription>
                    Will auto-accept lowest bid within tolerance if unbooked within 1hr of deadline
                  </FieldDescription>
                  <FieldError message={errors.tolerance?.message} />
                </Field>
                <Field>
                  <FieldLabel>Trigger (hours before deadline)</FieldLabel>
                  {(() => {
                    const { onChange, ...rest } = register('trigger', {
                      min: { value: 1, message: 'Must be at least 1 hour' },
                      validate: (v) =>
                        !v || !!values.tolerance || 'Tolerance required when trigger hours is set',
                    })
                    return (
                      <Input
                        className={inputCls}
                        type="number"
                        placeholder="1"
                        onChange={(e) => {
                          onChange(e)
                          trigger('tolerance')
                        }}
                        {...rest}
                      />
                    )
                  })()}
                  <FieldDescription>
                    System auto-accepts the best eligible bid at this threshold
                  </FieldDescription>
                  <FieldError message={errors.trigger?.message} />
                </Field>
                <Field>
                  <FieldLabel>Additional Notes</FieldLabel>
                  <Textarea
                    className="resize-none bg-background border-border placeholder:text-muted-foreground/50"
                    rows={3}
                    placeholder="e.g. fragile cargo, dock access required..."
                    {...register('notes')}
                  />
                </Field>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Load Summary sidebar */}
      <div className="min-w-0 p-2">
        <div className="p-4">
          <Card className="lg:sticky lg:top-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Load Summary</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {summaryRows.map(({ label, value }) => (
                <div key={label} className="flex justify-between text-sm gap-2">
                  <span className="text-muted-foreground shrink-0">{label}</span>
                  <span className="font-medium text-right truncate min-w-0">{value}</span>
                </div>
              ))}

              {(values.minPrice || values.maxPrice) && (
                <div className="mt-2 rounded-lg border-2 border-primary p-4">
                  <p className="text-xs font-semibold text-primary uppercase tracking-wide">
                    Auction Price Range
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-2xl font-bold text-primary">
                      ${values.minPrice || '—'}
                    </span>
                    <ArrowRight size={16} className="text-primary" />
                    <span className="text-2xl font-bold text-primary">
                      ${values.maxPrice || '—'}
                    </span>
                  </div>
                  {(values.escalationRate || values.tolerance) && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {values.escalationRate && `+$${values.escalationRate}/hr escalation`}
                      {values.escalationRate && values.tolerance && ' · '}
                      {values.tolerance && `${values.tolerance}% tolerance`}
                    </p>
                  )}
                </div>
              )}

              <Button type="submit" className="w-full mt-2" size="lg" disabled={isSubmitting}>
                {isSubmitting ? 'Posting...' : 'Post'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  )
}
