import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import PageShell from '@/components/layout/PageShell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DataTable } from '@/components/shared/DataTable'
import BanUserDialog from '@/components/admin/BanUserDialog'
import DeleteUserDialog from '@/components/admin/DeleteUserDialog'
import { useListAdminUsersQuery, useUnbanUserMutation } from '@/services/adminApi/adminSlice'
import type { AdminUser } from '@/services/adminApi/adminEnum'
import { useRequiredMongoId } from '@/hooks/useAuth'
import { Search, User, Building2, ShieldCheck, ShieldOff, ShieldX, Ban, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { Skeleton } from '@/components/ui/skeleton'

const ROLE_BADGES: Record<string, React.ReactNode> = {
  driver: (
    <Badge variant="secondary" className="text-xs gap-1">
      <User className="h-3 w-3" />
      Driver
    </Badge>
  ),
  company: (
    <Badge variant="outline" className="text-xs gap-1">
      <Building2 className="h-3 w-3" />
      Company
    </Badge>
  ),
  admin: (
    <Badge className="text-xs gap-1 bg-primary/15 text-primary border-primary/20">
      <ShieldCheck className="h-3 w-3" />
      Admin
    </Badge>
  ),
}

function StatusBadge({ isBanned }: { isBanned: boolean }) {
  return isBanned ? (
    <Badge variant="destructive" className="text-xs gap-1">
      <ShieldX className="h-3 w-3" />
      Banned
    </Badge>
  ) : (
    <Badge
      variant="outline"
      className="text-xs gap-1 border-green-200 bg-green-100 text-green-700 dark:border-green-900/40 dark:bg-green-900/30 dark:text-green-400"
    >
      <ShieldOff className="h-3 w-3" />
      Active
    </Badge>
  )
}

const ROLE_FILTERS = ['all', 'driver', 'company', 'admin'] as const
type RoleFilter = (typeof ROLE_FILTERS)[number]

const STATUS_FILTERS = ['all', 'active', 'banned'] as const
type StatusFilter = (typeof STATUS_FILTERS)[number]

const STATUS_FILTER_LABELS: Record<StatusFilter, string> = {
  all: 'All statuses',
  active: 'Active only',
  banned: 'Banned only',
}

const formatDate = (iso: string) => format(new Date(iso), 'MMM d, yyyy')
const formatDateTime = (iso: string) => format(new Date(iso), 'MMM d, yyyy · h:mm a')

export default function AdminUsers() {
  const adminId = useRequiredMongoId()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [banTarget, setBanTarget] = useState<AdminUser | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null)

  const { data: users = [], isLoading } = useListAdminUsersQuery(
    roleFilter === 'all' ? {} : { role: roleFilter }
  )
  const [unbanUser, { isLoading: isUnbanning }] = useUnbanUserMutation()

  const filtered = users.filter((u) => {
    if (statusFilter === 'active' && u.isBanned) return false
    if (statusFilter === 'banned' && !u.isBanned) return false
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
  })

  const columns = useMemo<ColumnDef<AdminUser>[]>(
    () => [
      {
        id: 'user',
        header: 'User',
        cell: ({ row }) => {
          const user = row.original
          return (
            <div className="flex items-center gap-3">
              {user.profilePictureUrl ? (
                <img
                  src={user.profilePictureUrl}
                  alt={user.name}
                  className="h-8 w-8 rounded-full object-cover shrink-0"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                  {user.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="font-medium truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
          )
        },
      },
      {
        accessorKey: 'role',
        header: 'Role',
        cell: ({ row }) => {
          const role = row.getValue<string>('role')
          return ROLE_BADGES[role] ?? <Badge variant="secondary">{role}</Badge>
        },
        meta: { responsive: 'sm' },
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge isBanned={row.original.isBanned} />,
        meta: { responsive: 'sm' },
      },
      {
        accessorKey: 'createdAt',
        header: 'Joined',
        cell: ({ row }) => formatDate(row.getValue<string>('createdAt')),
        meta: { responsive: 'md' },
      },
      {
        accessorKey: 'lastActiveAt',
        header: 'Last Active',
        cell: ({ row }) => {
          const v = row.getValue<string | null>('lastActiveAt')
          return v ? formatDate(v) : '—'
        },
        meta: { responsive: 'lg' },
      },
    ],
    []
  )

  return (
    <PageShell title="Users" subtitle={`${filtered.length} users`}>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4" data-tour="admin-user-filters">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1">
          {ROLE_FILTERS.map((r) => (
            <Button
              key={r}
              size="sm"
              variant={roleFilter === r ? 'default' : 'outline'}
              className="capitalize h-8 text-xs"
              onClick={() => setRoleFilter(r)}
            >
              {r}
            </Button>
          ))}
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger size="sm" className="w-[140px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_FILTER_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="rounded-xl border" data-tour="admin-users-table">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3 border-b last:border-b-0">
              <Skeleton className="h-8 w-8 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-4 w-24 hidden sm:block" />
              <Skeleton className="h-4 w-24 hidden lg:block" />
            </div>
          ))}
        </div>
      ) : (
        <div data-tour="admin-users-table">
          <DataTable
            columns={columns}
            data={filtered}
            getId={(user) => user._id}
            drawerTitle={(user) => user.name}
            drawerFields={[
              { label: 'Email', renderValue: (u) => u.email },
              { label: 'Phone', renderValue: (u) => u.phone || '—' },
              { label: 'Role', renderValue: (u) => ROLE_BADGES[u.role] ?? u.role },
              { label: 'Status', renderValue: (u) => <StatusBadge isBanned={u.isBanned} /> },
              { label: 'Joined', renderValue: (u) => formatDateTime(u.createdAt) },
              {
                label: 'Last Active',
                renderValue: (u) => (u.lastActiveAt ? formatDateTime(u.lastActiveAt) : 'Never'),
              },
              {
                label: 'Banned At',
                renderValue: (u) => (u.isBanned && u.bannedAt ? formatDateTime(u.bannedAt) : '—'),
              },
              {
                label: 'Ban Reason',
                renderValue: (u) => (u.isBanned ? u.bannedReason || '—' : '—'),
              },
            ]}
            drawerFooter={(user, { onClose }) => {
              const isSelf = user._id === adminId
              const isAdmin = user.role === 'admin'
              return (
                <div className="flex w-full flex-wrap items-center justify-end gap-2">
                  {!isAdmin && !isSelf && (
                    <>
                      {user.isBanned ? (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isUnbanning}
                          onClick={() => unbanUser({ userId: user._id })}
                        >
                          <ShieldOff className="h-4 w-4" />
                          Unban User
                        </Button>
                      ) : (
                        <Button variant="destructive" size="sm" onClick={() => setBanTarget(user)}>
                          <Ban className="h-4 w-4" />
                          Ban User
                        </Button>
                      )}
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setDeleteTarget(user)
                          onClose()
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete User
                      </Button>
                    </>
                  )}
                  <Button variant="ghost" size="sm" onClick={onClose}>
                    Close
                  </Button>
                </div>
              )
            }}
          />
        </div>
      )}

      <BanUserDialog user={banTarget} onOpenChange={(open) => !open && setBanTarget(null)} />
      <DeleteUserDialog
        user={deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onDeleted={() => setDeleteTarget(null)}
      />
    </PageShell>
  )
}
