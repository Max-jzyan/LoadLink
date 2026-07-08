import DynamicCard from '@/components/layout/DynamicCard'
import type { DriverProfile } from '@/services/driverApi/driverEnum'
import { BadgeCheck, CalendarDays } from 'lucide-react'

import EditPencilButton from '@/components/shared/EditPencilButton'

interface DriverInfoCardProps {
  driver: DriverProfile
  onEdit?: () => void
}

export default function DriverInfoCard({ driver, onEdit }: DriverInfoCardProps) {
  const memberSince = new Date(driver.createdAt)
  const memberSinceStr = memberSince.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  const initials = driver.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <DynamicCard noPadding>
      <div className="relative px-4 pt-6 pb-4">
        {/* Edit Button */}
        {onEdit && (
          <div className="absolute right-2 top-2">
            <EditPencilButton onClick={onEdit} ariaLabel="Edit profile" title="Edit profile" />
          </div>
        )}

        <div className="flex flex-col items-center">
          {/* Avatar / Profile Picture */}
          {driver.profilePictureUrl ? (
            <img
              src={driver.profilePictureUrl}
              alt={driver.name}
              className="h-20 w-20 rounded-full object-cover ring-2 ring-muted"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary ring-2 ring-muted">
              {initials}
            </div>
          )}

          {/* Name */}
          <h2 className="mt-3 text-lg font-semibold">{driver.name}</h2>

          {/* Professional Title */}
          {driver.professionalTitle && (
            <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <BadgeCheck className="h-4 w-4 text-primary" />
              <span>{driver.professionalTitle}</span>
            </div>
          )}

          {/* Member Since */}
          <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" />
            <span>Member since {memberSinceStr}</span>
          </div>
        </div>
      </div>
    </DynamicCard>
  )
}
