import DynamicCard from '@/components/layout/DynamicCard'
import PageShell from '@/components/layout/PageShell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { RoutePath } from '@/config/routes'
import { cn } from '@/lib/utils'
import {
  AlertTriangle,
  Building2,
  ChevronRight,
  ClipboardList,
  EyeOff,
  Loader2,
  ShieldAlert,
  User,
} from 'lucide-react'
import { useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { selectRole } from '@/services/authSlice'
import {
  useBlockUserMutation,
  useGetBlocklistQuery,
  useGetFeedPreferencesQuery,
  useUnblockUserMutation,
  useUpdateFeedPreferencesMutation,
} from '@/services/blocklistApi/blocklistSlice'
import type { BlockedTargetType, BlocklistEntry } from '@/services/blocklistApi/blocklistEnum'
import { useRequiredMongoId } from '@/hooks/useAuth'

const DRIVER_BLOCK_REASONS = [
  { value: 'low_offers', label: 'Consistently low offers' },
  { value: 'late_payment', label: 'Late or missing payment' },
  { value: 'inaccurate_info', label: 'Inaccurate load details' },
  { value: 'unsafe', label: 'Unsafe conditions' },
  { value: 'unprofessional', label: 'Unprofessional behavior' },
  { value: 'other', label: 'Other' },
]

const COMPANY_BLOCK_REASONS = [
  { value: 'no_show', label: 'No-show on accepted load' },
  { value: 'cargo_damage', label: 'Cargo damage or loss' },
  { value: 'unprofessional', label: 'Unprofessional behavior' },
  { value: 'safety', label: 'Safety violations' },
  { value: 'fraud', label: 'Fraudulent claims' },
  { value: 'other', label: 'Other' },
]

interface FeedPref {
  key: 'hideBlocked' | 'hideBelowMinimum' | 'notifyReview'
  label: string
  description: string
}

const DRIVER_FEED_PREFS: FeedPref[] = [
  {
    key: 'hideBlocked',
    label: 'Hide loads from blocked companies',
    description: 'Loads posted by companies on your blocklist never appear in your feed.',
  },
  {
    key: 'hideBelowMinimum',
    label: 'Hide loads below my minimum rate',
    description: 'Uses the minimum rate from your pricing preferences.',
  },
]

const COMPANY_FEED_PREFS: FeedPref[] = [
  {
    key: 'hideBlocked',
    label: 'Hide bids from blocked drivers',
    description: 'Bids from drivers on your blocklist are hidden from your auctions.',
  },
  {
    key: 'notifyReview',
    label: 'Alert me when a blocked driver bids',
    description: 'Get notified instead of silently hiding the bid.',
  },
]

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

const entryName = (entry: BlocklistEntry) => entry.targetId?.name ?? 'Deleted account'

function TypeBadge({ type }: { type: BlockedTargetType }) {
  return (
    <Badge
      className={cn(
        'text-[10px] font-semibold uppercase tracking-wide',
        type === 'company'
          ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400'
          : 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400'
      )}
      variant="outline"
    >
      {type === 'company' ? 'Company' : 'Driver'}
    </Badge>
  )
}

function BlockedItemRow({
  entry,
  onUnblock,
  onReport,
}: {
  entry: BlocklistEntry
  onUnblock: (entry: BlocklistEntry) => void
  onReport: (entry: BlocklistEntry) => void
}) {
  const Icon = entry.targetType === 'company' ? Building2 : User

  return (
    <div className="flex items-start gap-3 py-3 border-b last:border-b-0">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{entryName(entry)}</span>
          <TypeBadge type={entry.targetType} />
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          Blocked {formatDate(entry.blockedAt)}
        </p>
        {entry.reason && (
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{entry.reason}</p>
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <Button variant="outline" size="sm" onClick={() => onUnblock(entry)}>
          Unblock
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onReport(entry)}>
          Report
        </Button>
      </div>
    </div>
  )
}

export default function BlocklistPreferences() {
  const role = useSelector(selectRole)
  const isCompany = role === 'company'
  const navigate = useNavigate()
  const userId = useRequiredMongoId()
  const searchInputRef = useRef<HTMLInputElement>(null)

  const blockReasons = isCompany ? COMPANY_BLOCK_REASONS : DRIVER_BLOCK_REASONS
  const feedPrefs = isCompany ? COMPANY_FEED_PREFS : DRIVER_FEED_PREFS
  const entityNoun = isCompany ? 'driver' : 'company'

  const { data: blocked = [], isLoading } = useGetBlocklistQuery(userId)
  const { data: prefs = {} } = useGetFeedPreferencesQuery(userId)
  const [blockUser, { isLoading: isBlocking }] = useBlockUserMutation()
  const [unblockUser] = useUnblockUserMutation()
  const [updateFeedPreferences] = useUpdateFeedPreferencesMutation()

  const [searchQuery, setSearchQuery] = useState('')
  const [blockReason, setBlockReason] = useState('')
  const [pendingUnblock, setPendingUnblock] = useState<BlocklistEntry | null>(null)

  const tabs = isCompany
    ? [{ key: 'drivers' as const, label: 'Blocked Drivers', count: blocked.length }]
    : [
        { key: 'companies' as const, label: 'Blocked Companies', count: blocked.length },
        { key: 'hidden' as const, label: 'Hidden Loads', count: 0 },
      ]

  const [activeTab, setActiveTab] = useState(tabs[0].key)

  const togglePref = (key: FeedPref['key'], value: boolean) => {
    updateFeedPreferences({ userId, body: { [key]: value } })
  }

  const confirmUnblock = async () => {
    if (!pendingUnblock || !pendingUnblock.targetId) return
    try {
      await unblockUser({ userId, targetId: pendingUnblock.targetId._id }).unwrap()
    } finally {
      setPendingUnblock(null)
    }
  }

  const handleReport = (entry: BlocklistEntry) => {
    navigate(RoutePath.ReportFraud, { state: { entityName: entryName(entry) } })
  }

  const handleBlock = async () => {
    if (!searchQuery.trim()) return
    try {
      await blockUser({
        userId,
        body: {
          targetName: searchQuery.trim(),
          targetType: isCompany ? 'driver' : 'company',
          reason: blockReasons.find((r) => r.value === blockReason)?.label ?? '',
        },
      }).unwrap()
      setSearchQuery('')
      setBlockReason('')
      setActiveTab(tabs[0].key)
    } catch {
      // error toast handled by the mutation
    }
  }

  return (
    <PageShell
      title="Blocklist & Preferences"
      subtitle="Manage your blocklist and control which loads appear in your feed."
      stickyBar={
        <div className="flex rounded-lg border border-border overflow-hidden w-fit">
          {tabs.map((tab) => (
            <Button
              key={tab.key}
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'rounded-none border-0',
                activeTab === tab.key ? 'filter-btn-active' : 'filter-btn-inactive'
              )}
            >
              {tab.label} ({tab.count})
            </Button>
          ))}
        </div>
      }
      actions={
        <Button
          variant="destructive"
          size="sm"
          className="bg-red-500 hover:bg-red-600 text-white"
          onClick={() => searchInputRef.current?.focus()}
        >
          <ShieldAlert className="h-4 w-4" />
          Block a {isCompany ? 'Driver' : 'Company'}
        </Button>
      }
    >
      <div className="space-y-4">
        {/* Blocked list / hidden loads */}
        <DynamicCard
          title={
            activeTab === 'hidden'
              ? 'Hidden Loads'
              : `Blocked ${isCompany ? 'Drivers' : 'Companies'}`
          }
        >
          {activeTab === 'hidden' && (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <EyeOff className="h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No hidden loads.</p>
              <p className="text-xs text-muted-foreground max-w-sm">
                Loads you hide from your feed will show up here so you can restore them later.
              </p>
            </div>
          )}
          {activeTab !== 'hidden' && isLoading && (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {activeTab !== 'hidden' && !isLoading && blocked.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <ShieldAlert className="h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                No blocked {isCompany ? 'drivers' : 'companies'} yet.
              </p>
              <p className="text-xs text-muted-foreground max-w-sm">
                Blocked{' '}
                {isCompany
                  ? 'drivers cannot bid on your loads'
                  : 'companies never appear in your load feed'}
                .
              </p>
            </div>
          )}
          {activeTab !== 'hidden' &&
            !isLoading &&
            blocked.length > 0 &&
            blocked.map((entry) => (
              <BlockedItemRow
                key={entry._id}
                entry={entry}
                onUnblock={setPendingUnblock}
                onReport={handleReport}
              />
            ))}
        </DynamicCard>

        {/* Block form */}
        <DynamicCard
          title={`Block a ${isCompany ? 'Driver' : 'Company'}`}
          description={`Blocked ${entityNoun === 'company' ? 'companies are removed from your feed' : 'drivers cannot bid on your loads'}. The name must match a registered ${entityNoun}.`}
        >
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              ref={searchInputRef}
              placeholder={`Search ${entityNoun} name...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
              onKeyDown={(e) => e.key === 'Enter' && handleBlock()}
            />
            <Select value={blockReason} onValueChange={setBlockReason}>
              <SelectTrigger className="w-full sm:w-52">
                <SelectValue placeholder="Select reason..." />
              </SelectTrigger>
              <SelectContent>
                {blockReasons.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="destructive"
              className="bg-red-500 hover:bg-red-600 text-white"
              onClick={handleBlock}
              disabled={!searchQuery.trim() || isBlocking}
            >
              {isBlocking && <Loader2 className="h-4 w-4 animate-spin" />}
              Block
            </Button>
          </div>
        </DynamicCard>

        {/* Feed preferences */}
        <DynamicCard
          title="Feed Preferences"
          description="Control how your blocklist affects what you see."
        >
          <div className="space-y-4">
            {feedPrefs.map((pref) => (
              <div key={pref.key} className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{pref.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{pref.description}</p>
                </div>
                <Switch
                  checked={prefs[pref.key] ?? false}
                  onCheckedChange={(checked) => togglePref(pref.key, checked)}
                />
              </div>
            ))}
          </div>
        </DynamicCard>

        {/* Report & Trust */}
        <DynamicCard title="Report & Trust">
          <div className="space-y-1">
            <button
              onClick={() => navigate(RoutePath.ReportFraud)}
              className="w-full flex items-center justify-between rounded-md px-3 py-2.5 text-sm hover:bg-muted transition-colors group"
            >
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="h-4 w-4 text-red-500" />
                <span>Report a {entityNoun} for fraud</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </button>
            <button
              onClick={() => navigate(RoutePath.ReportInaccurate)}
              className="w-full flex items-center justify-between rounded-md px-3 py-2.5 text-sm hover:bg-muted transition-colors group"
            >
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <span>Report inaccurate {isCompany ? 'driver' : 'load'} details</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </button>
            <button
              onClick={() => navigate(RoutePath.Report)}
              className="w-full flex items-center justify-between rounded-md px-3 py-2.5 text-sm hover:bg-muted transition-colors group"
            >
              <div className="flex items-center gap-2.5">
                <ClipboardList className="h-4 w-4 text-primary" />
                <span>View my submitted reports</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </button>
          </div>
        </DynamicCard>
      </div>

      {/* Unblock confirmation */}
      <Dialog
        open={pendingUnblock !== null}
        onOpenChange={(open) => !open && setPendingUnblock(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unblock {pendingUnblock ? entryName(pendingUnblock) : ''}?</DialogTitle>
            <DialogDescription>
              {pendingUnblock?.targetType === 'company'
                ? 'Their loads will appear in your feed again.'
                : 'They will be able to bid on your loads again.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Keep Blocked</Button>
            </DialogClose>
            <Button onClick={confirmUnblock}>Unblock</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}
