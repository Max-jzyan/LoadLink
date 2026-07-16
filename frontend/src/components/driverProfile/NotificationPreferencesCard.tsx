import DynamicCard from '@/components/layout/DynamicCard'
import type { NotificationPreferences } from '@/services/userApi/userEnum'
import { Mail, MessageSquare, Briefcase } from 'lucide-react'

interface NotificationPreferencesCardProps {
  notificationPreferences: NotificationPreferences
}

export default function NotificationPreferencesCard({ notificationPreferences }: NotificationPreferencesCardProps) {
  const items = [
    {
      icon: Mail,
      label: 'Email Notifications',
      enabled: notificationPreferences.email,
    },
    {
      icon: MessageSquare,
      label: 'SMS Notifications',
      enabled: notificationPreferences.sms,
    },
    {
      icon: Briefcase,
      label: 'Work Notifications',
      enabled: notificationPreferences.workNotifications,
    },
  ]

  return (
    <DynamicCard title="Notification Preferences">
      <div className="space-y-3">
        {items.map(({ icon: Icon, label, enabled }) => (
          <div key={label} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{label}</span>
            </div>
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                enabled
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {enabled ? 'On' : 'Off'}
            </span>
          </div>
        ))}
      </div>
    </DynamicCard>
  )
}