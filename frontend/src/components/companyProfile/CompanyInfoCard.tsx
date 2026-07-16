import DynamicCard from '@/components/layout/DynamicCard'
import type { CompanyProfile } from '@/services/companyApi/companyEnum'
import { BadgeCheck, CalendarDays, Briefcase } from 'lucide-react'
import EditPencilButton from '@/components/shared/EditPencilButton'

interface CompanyInfoCardProps {
  company: CompanyProfile
  onEdit?: () => void
}

export default function CompanyInfoCard({ company, onEdit }: CompanyInfoCardProps) {
  const memberSince = new Date(company.createdAt)
  const memberSinceStr = memberSince.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  const displayName = company.companyName || company.name
  const initials = displayName
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
          {company.profilePictureUrl ? (
            <img
              src={company.profilePictureUrl}
              alt={displayName}
              className="h-20 w-20 rounded-full object-cover ring-2 ring-muted"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary ring-2 ring-muted">
              {initials}
            </div>
          )}

          {/* Company Name */}
          <h2 className="mt-3 text-lg font-semibold">{displayName}</h2>

          {/* Contact Name */}
          {company.contactName && (
            <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <BadgeCheck className="h-4 w-4 text-primary" />
              <span>Contact: {company.contactName}</span>
            </div>
          )}

          {/* Member Since */}
          <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" />
            <span>Member since {memberSinceStr}</span>
          </div>
        </div>

        {/* Company Details */}
        <div className="mt-4 space-y-2">
          {company.businessAddress && (
            <div className="flex items-start gap-2 text-sm">
              <span className="text-muted-foreground min-w-[70px] text-xs font-medium">Address:</span>
              <span className="text-sm">{company.businessAddress}</span>
            </div>
          )}

          {company.businessNumber && (
            <div className="flex items-start gap-2 text-sm">
              <span className="text-muted-foreground min-w-[70px] text-xs font-medium">Bus. #:</span>
              <span className="font-mono text-sm">{company.businessNumber}</span>
            </div>
          )}

          <div className="flex items-start gap-2 text-sm">
            <Briefcase className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm">{company.postedLoadsCount} loads posted</span>
          </div>
        </div>
      </div>
    </DynamicCard>
  )
}