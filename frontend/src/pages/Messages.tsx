import LoadMessagesDrawer from '@/components/messages/LoadMessagesDrawer'
import PageShell from '@/components/layout/PageShell'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useRequiredMongoId } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import {
  useListMessageThreadsQuery,
  type MessageThreadSummary,
} from '@/services/messageApi/messageSlice'
import { LOAD_STATUSES, type LoadStatus } from '@/types/enums'
import { formatDistanceToNow } from 'date-fns'
import { ArrowRight, Loader2, MessageSquare, RefreshCw, Search } from 'lucide-react'
import { useMemo, useState } from 'react'

type ThreadFilter = 'all' | 'active' | 'completed' | 'cancelled'

const FILTER_OPTIONS: { value: ThreadFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

function matchesFilter(thread: MessageThreadSummary, filter: ThreadFilter): boolean {
  switch (filter) {
    case 'completed':
      return thread.loadStatus === LOAD_STATUSES.Completed
    case 'cancelled':
      return thread.loadStatus === LOAD_STATUSES.Cancelled
    case 'active':
      // Status-only, so a thread never seems to jump tabs as it's read
      return (
        thread.loadStatus !== LOAD_STATUSES.Completed &&
        thread.loadStatus !== LOAD_STATUSES.Cancelled
      )
    default:
      return true
  }
}

function ThreadRow({
  thread,
  isMine,
  onOpen,
}: {
  thread: MessageThreadSummary
  isMine: boolean
  onOpen: (loadId: string) => void
}) {
  const originShort = thread.originAddress.split(',')[0].trim()
  const destinationShort = thread.destinationAddress.split(',')[0].trim()
  const hasUnread = thread.unreadCount > 0

  return (
    <div
      onClick={(e) => {
        // Blur first to avoid an aria-hidden-on-focused-element warning
        e.currentTarget.blur()
        onOpen(thread.loadId)
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key !== 'Enter') return
        e.currentTarget.blur()
        onOpen(thread.loadId)
      }}
      className={cn(
        'rounded-xl border bg-card p-4 flex items-center gap-4 cursor-pointer transition-colors hover:bg-muted/30',
        hasUnread && 'bg-primary/5 border-primary/20'
      )}
    >
      <Avatar>
        {thread.counterparty.profilePictureUrl && (
          <AvatarImage src={thread.counterparty.profilePictureUrl} alt={thread.counterparty.name} />
        )}
        <AvatarFallback>{thread.counterparty.name.charAt(0).toUpperCase()}</AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <span className={cn('text-sm truncate', hasUnread ? 'font-semibold' : 'font-medium')}>
            {thread.counterparty.name}
          </span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground min-w-0">
            <span className="truncate">{originShort}</span>
            <ArrowRight className="h-3 w-3 shrink-0" />
            <span className="truncate">{destinationShort}</span>
          </span>
          <StatusBadge status={thread.loadStatus as LoadStatus} />
        </div>
        <p
          className={cn(
            'text-xs truncate',
            hasUnread ? 'text-foreground font-medium' : 'text-muted-foreground'
          )}
        >
          {isMine ? 'You: ' : ''}
          {thread.lastMessage.body}
        </p>
      </div>

      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className="text-xs text-muted-foreground/70">
          {formatDistanceToNow(new Date(thread.lastMessage.createdAt), { addSuffix: true })}
        </span>
        {hasUnread && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground leading-none">
            {thread.unreadCount > 9 ? '9+' : thread.unreadCount}
          </span>
        )}
      </div>
    </div>
  )
}

export default function Messages() {
  const myId = useRequiredMongoId()
  const [filter, setFilter] = useState<ThreadFilter>('all')
  const [search, setSearch] = useState('')
  const [openLoadId, setOpenLoadId] = useState<string | null>(null)

  // refetchOnMountOrArgChange: polling pauses while unmounted, so a fresh
  // visit could otherwise show a stale cached list
  const {
    data: threads = [],
    isLoading,
    isFetching,
    refetch,
  } = useListMessageThreadsQuery(undefined, {
    pollingInterval: 15_000,
    refetchOnMountOrArgChange: true,
  })

  const filtered = useMemo(() => {
    let result = threads.filter((t) => matchesFilter(t, filter))
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (t) =>
          t.counterparty.name.toLowerCase().includes(q) ||
          t.originAddress.toLowerCase().includes(q) ||
          t.destinationAddress.toLowerCase().includes(q)
      )
    }
    return result
  }, [threads, filter, search])

  const totalUnread = threads.reduce((sum, t) => sum + t.unreadCount, 0)

  return (
    <PageShell
      title="Messages"
      subtitle={
        totalUnread > 0
          ? `${totalUnread} unread message${totalUnread !== 1 ? 's' : ''}`
          : 'Conversations with your loads’ counterparties'
      }
      stickyBar={
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex w-fit overflow-hidden rounded-lg border border-border">
            {FILTER_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                variant="ghost"
                size="sm"
                className={cn(
                  'rounded-none border-0',
                  filter === opt.value ? 'filter-btn-active' : 'filter-btn-inactive'
                )}
                onClick={() => setFilter(opt.value)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
          <div className="relative flex-1 max-w-sm min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by name or route…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Badge variant="secondary">
            {filtered.length} conversation{filtered.length !== 1 ? 's' : ''}
          </Badge>
        </div>
      }
      actions={
        <Button variant="outline" size="sm" onClick={refetch} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-1 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      }
    >
      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <MessageSquare className="h-10 w-10 mb-3 opacity-30" />
          <p className="text-sm font-medium">
            {search || filter !== 'all'
              ? 'No conversations match your filters.'
              : 'No conversations yet.'}
          </p>
          <p className="text-xs mt-1 opacity-70 text-center max-w-sm">
            {search || filter !== 'all'
              ? 'Try a different search or status filter.'
              : 'Once a load is awarded, you can message the other party from the load page. Conversations will show up here.'}
          </p>
        </div>
      )}

      {!isLoading && filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map((thread) => (
            <ThreadRow
              key={thread.loadId}
              thread={thread}
              isMine={thread.lastMessage.senderId === myId}
              onOpen={setOpenLoadId}
            />
          ))}
        </div>
      )}

      {openLoadId && (
        <LoadMessagesDrawer
          loadId={openLoadId}
          open={!!openLoadId}
          onOpenChange={(open) => !open && setOpenLoadId(null)}
        />
      )}
    </PageShell>
  )
}
