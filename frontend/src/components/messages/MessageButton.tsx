import LoadMessagesDrawer from '@/components/messages/LoadMessagesDrawer'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useGetMessageUnreadCountsQuery } from '@/services/messageApi/messageSlice'
import { MessageSquare } from 'lucide-react'
import { useState } from 'react'

interface MessageButtonProps {
  loadId: string
  /** Button label, e.g. "Message Driver". Omit for the icon-only variant. */
  label?: string
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'sm' | 'icon'
  className?: string
}

/**
 * Opens the per-load message thread. Shows an unread-count badge fed by
 * /api/messages/unread-counts (one shared polled query across all instances).
 */
export default function MessageButton({
  loadId,
  label,
  variant = 'outline',
  size = 'sm',
  className,
}: MessageButtonProps) {
  const [open, setOpen] = useState(false)

  // refetchOnMountOrArgChange: this button mounts fresh on every page that
  // renders it, so without this it could show a stale badge count left over
  // from a previous mount's cache until the next poll tick.
  const { data: unreadData } = useGetMessageUnreadCountsQuery(undefined, {
    pollingInterval: 15_000,
    refetchOnMountOrArgChange: true,
  })
  const unread = unreadData?.byLoad[loadId] ?? 0

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={cn('relative', className)}
        onClick={(e) => {
          e.stopPropagation()
          // Blur before opening: the drawer marks the rest of the page
          // aria-hidden while open, and a still-focused trigger underneath
          // it would trip "aria-hidden on a focused element" a11y warnings.
          e.currentTarget.blur()
          setOpen(true)
        }}
        title={label ?? 'Messages'}
        aria-label={`Messages${unread > 0 ? ` (${unread} unread)` : ''}`}
      >
        <MessageSquare className="h-4 w-4" />
        {label}
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </Button>

      {open && <LoadMessagesDrawer loadId={loadId} open={open} onOpenChange={setOpen} />}
    </>
  )
}
