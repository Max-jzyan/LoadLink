import { useEventSource } from '@/components/auction/useEventSource'
import DrawerShell from '@/components/layout/DrawerShell'
import Spinner from '@/components/shared/Spinner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Bubble, BubbleContent } from '@/components/ui/bubble'
import { Button } from '@/components/ui/button'
import {
  Message as MessageRow,
  MessageAvatar,
  MessageContent,
  MessageFooter,
} from '@/components/ui/message'
import { Textarea } from '@/components/ui/textarea'
import { useRequiredMongoId } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import {
  MESSAGE_BODY_MAX_LENGTH,
  messageApi,
  useGetLoadThreadQuery,
  useMarkThreadReadMutation,
  useSendMessageMutation,
  type Message,
  type ThreadCounterparty,
} from '@/services/messageApi/messageSlice'
import type { AppDispatch } from '@/services/store'
import { format, isSameDay } from 'date-fns'
import { MessageSquare, SendHorizontal } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useDispatch } from 'react-redux'

function formatMessageTime(iso: string) {
  const date = new Date(iso)
  return isSameDay(date, new Date()) ? format(date, 'h:mm a') : format(date, 'MMM d, h:mm a')
}

function ChatMessage({
  message,
  isMine,
  showAvatar,
  counterparty,
}: {
  message: Message
  isMine: boolean
  /** Render the sender avatar (last message of a consecutive incoming run). */
  showAvatar: boolean
  counterparty?: ThreadCounterparty
}) {
  return (
    <MessageRow align={isMine ? 'end' : 'start'}>
      {!isMine && (
        <MessageAvatar className={cn(!showAvatar && 'invisible')}>
          <Avatar>
            {counterparty?.profilePictureUrl && (
              <AvatarImage src={counterparty.profilePictureUrl} alt={counterparty.name} />
            )}
            <AvatarFallback>{(counterparty?.name ?? '?').charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
        </MessageAvatar>
      )}
      <MessageContent>
        <Bubble variant={isMine ? 'default' : 'secondary'} align={isMine ? 'end' : 'start'}>
          <BubbleContent className="whitespace-pre-wrap">{message.body}</BubbleContent>
        </Bubble>
        <MessageFooter className="text-[10px] font-normal text-muted-foreground/70">
          {formatMessageTime(message.createdAt)}
        </MessageFooter>
      </MessageContent>
    </MessageRow>
  )
}

interface LoadMessagesDrawerProps {
  loadId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Per-load chat thread between the posting company and the assigned driver.
 * Messages stream in live over SSE; opening the drawer marks the thread read.
 */
export default function LoadMessagesDrawer({
  loadId,
  open,
  onOpenChange,
}: LoadMessagesDrawerProps) {
  const myId = useRequiredMongoId()
  const dispatch = useDispatch<AppDispatch>()

  // refetchOnMountOrArgChange: MessageButton unmounts this drawer on close, so
  // without it a reopen would just serve RTK Query's cached (possibly stale)
  // thread instead of picking up messages sent while the drawer was closed.
  const { data: thread, isLoading } = useGetLoadThreadQuery(loadId, {
    skip: !open,
    refetchOnMountOrArgChange: true,
  })
  const [sendMessage, { isLoading: isSending }] = useSendMessageMutation()
  const [markThreadRead] = useMarkThreadReadMutation()

  const [draft, setDraft] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  // Live updates: subscribe to the thread's SSE channel while the drawer is open
  const { data: liveMessage } = useEventSource<Message>(
    open ? `/api/loads/${loadId}/messages/stream` : null
  )

  // Merge streamed messages into the cached thread (sender already has it via
  // the mutation patch; the guard prevents duplicates)
  useEffect(() => {
    if (!liveMessage || liveMessage.loadId !== loadId) return
    dispatch(
      messageApi.util.updateQueryData('getLoadThread', loadId, (draftThread) => {
        if (!draftThread.messages.some((m) => m._id === liveMessage._id)) {
          draftThread.messages.push(liveMessage)
        }
      })
    )
    // Incoming message read immediately since the thread is on screen
    if (liveMessage.recipientId === myId) markThreadRead(loadId)
  }, [liveMessage, loadId, myId, dispatch, markThreadRead])

  // Mark the thread read when it first renders with content (also refreshes
  // the unread badge via the mutation's tag invalidation)
  const messageCount = thread?.messages.length ?? 0
  useEffect(() => {
    if (open && messageCount > 0) markThreadRead(loadId)
  }, [open, messageCount, loadId, markThreadRead])

  // Keep the newest message in view
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messageCount, open])

  async function handleSend() {
    const body = draft.trim()
    if (!body || isSending) return
    try {
      await sendMessage({ loadId, body }).unwrap()
      setDraft('')
    } catch {
      // Error toast handled globally; keep the draft so the user can retry
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const counterparty = thread?.counterparty
  const title = counterparty ? `Message ${counterparty.name}` : 'Messages'
  let description: string | undefined
  if (counterparty) {
    description =
      counterparty.role === 'driver'
        ? 'Assigned driver for this load'
        : 'Company that posted this load'
  }

  return (
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
      direction="right"
      size="sm"
      title={title}
      description={description}
      footer={
        <div className="flex w-full items-end gap-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message…"
            maxLength={MESSAGE_BODY_MAX_LENGTH}
            rows={1}
            className="min-h-9 max-h-32 resize-none bg-background border-border placeholder:text-muted-foreground/50"
            aria-label="Message"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!draft.trim() || isSending}
            aria-label="Send message"
          >
            <SendHorizontal className="h-4 w-4" />
          </Button>
        </div>
      }
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner />
        </div>
      ) : (
        <div ref={scrollRef} className="flex h-full flex-col overflow-y-auto">
          {counterparty && (
            <div className="flex items-center gap-2 pb-3 mb-3 border-b">
              <Avatar size="sm">
                {counterparty.profilePictureUrl && (
                  <AvatarImage src={counterparty.profilePictureUrl} alt={counterparty.name} />
                )}
                <AvatarFallback>{counterparty.name.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{counterparty.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{counterparty.role}</p>
              </div>
            </div>
          )}

          {messageCount === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 py-16 text-muted-foreground">
              <MessageSquare className="h-10 w-10 mb-3 opacity-20" />
              <p className="text-sm font-medium">No messages yet</p>
              <p className="text-xs mt-1 opacity-70 text-center px-6">
                Coordinate pickup details, gate codes and delays here.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2 pb-2">
              {thread!.messages.map((m, i) => {
                const next = thread!.messages[i + 1]
                const isLastOfRun = !next || next.senderId !== m.senderId
                return (
                  <ChatMessage
                    key={m._id}
                    message={m}
                    isMine={m.senderId === myId}
                    showAvatar={isLastOfRun}
                    counterparty={counterparty}
                  />
                )
              })}
            </div>
          )}
        </div>
      )}
    </DrawerShell>
  )
}
