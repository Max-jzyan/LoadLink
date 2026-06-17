import { useForm } from 'react-hook-form'
import { TRUCK_TYPES } from '@/types/enums'
import type { CreateLoadPayload } from '@/services/loadApi/loadEnum'

export interface LoadFormValues extends CreateLoadPayload {}

export interface LoadFormFields {
  truckType: string
  truckSize: string
  weightLbs: string
  commodity: string
  certifications: string
  driverAssist: boolean
  originAddress: string
  originCoords: { lat: number; lng: number } | null
  destinationAddress: string
  destinationCoords: { lat: number; lng: number } | null
  pickupTime: string
  dropoffTime: string
  minPrice: string
  maxPrice: string
  escalationRate: string
  tolerance: string
  trigger: string
  notes: string
}

export function useLoadForm(
  initialValues: Partial<LoadFormValues> | undefined,
  onSubmit: (values: LoadFormValues) => void
) {
  const {
    register,
    control,
    setValue,
    watch,
    handleSubmit,
    getValues,
    trigger,
    formState: { errors },
  } = useForm<LoadFormFields>({
    mode: 'onTouched',
    defaultValues: {
      truckType: initialValues?.truckType ?? '',
      truckSize: String(initialValues?.trailerLengthFt ?? ''),
      weightLbs: String(initialValues?.weightLbs ?? ''),
      commodity: initialValues?.commodity ?? '',
      certifications: initialValues?.certifications?.join(', ') ?? '',
      driverAssist: initialValues?.driverAssist ?? false,
      originAddress: initialValues?.originAddress ?? '',
      originCoords: initialValues?.originCoords ?? null,
      destinationAddress: initialValues?.destinationAddress ?? '',
      destinationCoords: initialValues?.destinationCoords ?? null,
      pickupTime: initialValues?.pickupTime ?? '',
      dropoffTime: initialValues?.dropoffTime ?? '',
      minPrice: '',
      maxPrice: '',
      escalationRate: '',
      tolerance: '',
      trigger: '',
      notes: '',
    },
  })

  // Virtual fields — set via setValue, not spread on inputs
  register('originAddress', { required: 'Origin address is required' })
  register('originCoords', {
    validate: (v) => v !== null || 'Please select an address from the suggestions',
  })
  register('destinationAddress', {
    required: 'Destination address is required',
    validate: (v) =>
      !v || v !== getValues('originAddress') || 'Origin and destination must be different',
  })
  register('destinationCoords', {
    validate: (v) => v !== null || 'Please select an address from the suggestions',
  })
  register('pickupTime', {
    required: 'Pickup date is required',
    validate: (v) => !v || new Date(v) > new Date() || 'Pickup must be in the future',
  })
  register('dropoffTime', {
    required: 'Dropoff date is required',
    validate: (v) => {
      if (!v) return true
      const pickup = getValues('pickupTime')
      return !pickup || new Date(v) > new Date(pickup) || 'Dropoff must be after pickup'
    },
  })

  const values = watch()

  const truckLabel =
    TRUCK_TYPES.find((t) => t.value === values.truckType)?.label ?? values.truckType
  const truckDisplay = [truckLabel, values.truckSize ? `${values.truckSize} ft` : '']
    .filter(Boolean)
    .join(' · ')
  const routeDisplay =
    values.originAddress && values.destinationAddress
      ? `${values.originAddress} → ${values.destinationAddress}`
      : null

  const summaryRows = [
    { label: 'Truck', value: truckDisplay || '—' },
    { label: 'Route', value: routeDisplay || '—' },
    {
      label: 'Weight',
      value: values.weightLbs ? `${Number(values.weightLbs).toLocaleString()} lbs` : '—',
    },
    { label: 'Commodity', value: values.commodity || '—' },
    { label: 'Certifications', value: values.certifications || 'None' },
    { label: 'Driver Assist', value: values.driverAssist ? 'Required' : 'Not Required' },
  ]

  const onFormSubmit = handleSubmit((v) => {
    onSubmit({
      originAddress: v.originAddress,
      destinationAddress: v.destinationAddress,
      originCoords: v.originCoords ?? { lat: 0, lng: 0 },
      destinationCoords: v.destinationCoords ?? { lat: 0, lng: 0 },
      pickupTime: v.pickupTime,
      dropoffTime: v.dropoffTime,
      weightLbs: Number(v.weightLbs),
      commodity: v.commodity,
      truckType: v.truckType,
      trailerLengthFt: Number(v.truckSize),
      certifications: v.certifications
        ? v.certifications
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
      driverAssist: v.driverAssist,
    })
  })

  return { register, control, setValue, trigger, values, summaryRows, onFormSubmit, errors }
}
