import DynamicCard from '@/components/layout/DynamicCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { DriverProfile } from '@/services/driverApi/driverEnum'
import { Check, Loader2, Mail, MapPin, Phone, X } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

import EditPencilButton from '@/components/shared/EditPencilButton'

interface ContactInfoCardProps {
  driver: DriverProfile
  onSave: (values: ContactFormValues) => Promise<void>
}

export interface ContactFormValues {
  phone: string
  homeLocation: {
    city: string
    province: string
    country: string
  }
}

export default function ContactInfoCard({ driver, onSave }: ContactInfoCardProps) {
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<ContactFormValues>({
    defaultValues: {
      phone: driver.phone,
      homeLocation: {
        city: driver.homeLocation.city,
        province: driver.homeLocation.province,
        country: driver.homeLocation.country,
      },
    },
  })

  const locationParts = [
    driver.homeLocation.city,
    driver.homeLocation.province,
    driver.homeLocation.country,
  ].filter(Boolean)
  const locationStr = locationParts.length > 0 ? locationParts.join(', ') : null

  const onSubmit = async (values: ContactFormValues) => {
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

  return (
    <DynamicCard
      title="Contact Information"
      action={
        editing ? (
          <button
            onClick={() => {
              setError(null)
              setEditing(false)
            }}
            className="rounded-full p-2 hover:bg-muted transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
            title="Cancel"
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          <EditPencilButton
            onClick={() => {
              setError(null)
              setEditing(true)
            }}
            ariaLabel="Edit contact information"
            title="Edit"
          />
        )
      }
    >
      {editing ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          {error && (
            <p className="text-xs text-destructive bg-destructive/10 rounded px-2 py-1">{error}</p>
          )}

          {/* Phone */}
          <div className="flex items-start gap-2">
            <Phone className="mt-1.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground mb-1">Phone</p>
              <Input className={inputCls} {...register('phone')} placeholder="Phone number" />
            </div>
          </div>

          {/* Home Location */}
          <div className="flex items-start gap-2">
            <MapPin className="mt-1.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1 space-y-2">
              <p className="text-xs text-muted-foreground">Home Location</p>
              <div className="grid grid-cols-3 gap-2">
                <Input className={inputCls} placeholder="City" {...register('homeLocation.city')} />
                <Input
                  className={inputCls}
                  placeholder="Province"
                  {...register('homeLocation.province')}
                />
                <Input
                  className={inputCls}
                  placeholder="Country"
                  {...register('homeLocation.country')}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setError(null)
                setEditing(false)
              }}
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
      ) : (
        <div className="space-y-3">
          {/* Email (read-only) */}
          <div className="flex items-start gap-2">
            <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="text-sm break-all">{driver.email}</p>
            </div>
          </div>

          {/* Phone */}
          <div className="flex items-start gap-2">
            <Phone className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Phone</p>
              <p className="text-sm">{driver.phone || 'Not provided'}</p>
            </div>
          </div>

          {/* Home Location */}
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Home Location</p>
              <p className="text-sm">{locationStr || 'Not provided'}</p>
            </div>
          </div>
        </div>
      )}
    </DynamicCard>
  )
}
