import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'

import DrawerShell from '@/components/layout/DrawerShell'
import type { DriverProfile } from '@/services/driverApi/driverEnum'
import { Loader2 } from 'lucide-react'

import EditPencilButton from '@/components/shared/EditPencilButton'

export interface DriverInfoFormValues {
  name: string
  professionalTitle: string
  profilePictureUrl: string
}

interface DriverInfoDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  driver: DriverProfile
  onSubmit: (values: DriverInfoFormValues) => Promise<void>
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-xs text-destructive mt-1">{message}</p>
}

export default function DriverInfoDrawer({
  open,
  onOpenChange,
  driver,
  onSubmit,
}: DriverInfoDrawerProps) {
  const formId = 'driver-info-form'

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const {
    register,
    handleSubmit,

    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<DriverInfoFormValues>({
    defaultValues: {
      name: '',
      professionalTitle: '',
      profilePictureUrl: '',
    },
  })

  const profilePictureUrl = watch('profilePictureUrl')

  // Reset form when drawer opens with driver data; clear when it closes
  useEffect(() => {
    if (open && driver) {
      reset({
        name: driver.name,
        professionalTitle: driver.professionalTitle,
        profilePictureUrl: driver.profilePictureUrl,
      })
    }

    if (!open) {
      reset({
        name: '',
        professionalTitle: '',
        profilePictureUrl: '',
      })
    }
  }, [open, driver, reset])

  const onFormSubmit = async (values: DriverInfoFormValues) => {
    await onSubmit(values)
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB')
      return
    }

    // Convert to base64
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64String = reader.result as string
      setValue('profilePictureUrl', base64String)
    }
    reader.readAsDataURL(file)
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
    return 'Save Changes'
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
      title="Edit Personal Information"
      description="Update your name, professional title, and profile picture."
      size="md"
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
      <form id={formId} onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
        {/* Profile Picture Preview */}
        <div className="flex flex-col items-center">
          <div className="relative">
            {profilePictureUrl ? (
              <img
                src={profilePictureUrl}
                alt="Profile preview"
                className="h-24 w-24 rounded-full object-cover ring-2 ring-muted"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 text-3xl font-bold text-primary ring-2 ring-muted">
                {getInitials(driver.name)}
              </div>
            )}
            <div className="absolute bottom-0 right-0">
              <EditPencilButton
                onClick={() => fileInputRef.current?.click()}
                ariaLabel="Upload profile picture"
                title="Upload profile picture"
              />
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <FieldDescription className="mt-2 text-center">
            Click the pencil icon to upload a profile picture
          </FieldDescription>
        </div>

        {/* Name */}
        <Field>
          <FieldLabel>Full Name</FieldLabel>
          <Input
            className={inputCls}
            placeholder="Enter your full name"
            {...register('name', {
              required: 'Name is required',
              minLength: { value: 2, message: 'Name must be at least 2 characters' },
            })}
          />
          <FieldError message={errors.name?.message} />
        </Field>

        {/* Professional Title */}
        <Field>
          <FieldLabel>Professional Title</FieldLabel>
          <Input
            className={inputCls}
            placeholder="e.g. Long Haul Truck Driver"
            {...register('professionalTitle')}
          />
          <FieldDescription>Optional: Add a professional title or certification</FieldDescription>
        </Field>

        {/* Profile Picture URL (hidden, used for base64 storage) */}
        <input type="hidden" {...register('profilePictureUrl')} />
      </form>
    </DrawerShell>
  )
}
