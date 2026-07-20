import { useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import PageShell from '@/components/layout/PageShell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DataTable } from '@/components/shared/DataTable'
import { useListAdminUsersQuery } from '@/services/adminApi/adminSlice'
import type { AdminUser } from '@/services/adminApi/adminEnum'
import { Search, User, Building2, ShieldCheck } from 'lucide-react'
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

const ROLE_FILTERS = ['all', 'driver', 'company', 'admin'] as const
type RoleFilter = (typeof ROLE_FILTERS)[number]

const columns: ColumnDef<AdminUser>[] = [
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
    meta: {
      responsive: 'sm',
    },
  },
  {
    accessorKey: 'createdAt',
    header: 'Joined',
    cell: ({ row }) => format(new Date(row.getValue<string>('createdAt')), 'MMM d, yyyy'),
    meta: {
      responsive: 'md',
    },
  },
  {
    accessorKey: 'lastActiveAt',
    header: 'Last Active',
    cell: ({ row }) => {
      const v = row.getValue<string | null>('lastActiveAt')
      return v ? format(new Date(v), 'MMM d, yyyy') : '—'
    },
    meta: {
      responsive: 'lg',
    },
  },
]

export default function AdminUsers() {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')

  const { data: users = [], isLoading } = useListAdminUsersQuery(
    roleFilter === 'all' ? {} : { role: roleFilter }
  )

  const filtered = users.filter((u) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
  })

  return (
    <PageShell title="Users" subtitle={`${filtered.length} users`}>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
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
      </div>

      {isLoading ? (
        <div className="rounded-xl border">
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
        <DataTable columns={columns} data={filtered} getId={(user) => user._id} />
      )}
    </PageShell>
  )
}
