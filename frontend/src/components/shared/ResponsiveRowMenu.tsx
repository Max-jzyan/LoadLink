'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreVertical, ChevronRight } from 'lucide-react'
import type { Load } from '@/services/loadApi/loadEnum'
import type { LoadWithDetails } from '@/services/companyApi/companyTypes'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { type LoadStatus } from '@/types/enums'

interface MobileDetailField {
  label: string
  value: React.ReactNode
}

interface ResponsiveRowMenuProps {
  load: Load | LoadWithDetails
  /** Additional action items rendered inside the dropdown */
  children?: React.ReactNode
  /** Fields to show in the summary section of the mobile dropdown */
  mobileDetails?: MobileDetailField[]
}

export function ResponsiveRowMenu({ load, children, mobileDetails }: ResponsiveRowMenuProps) {
  const [open, setOpen] = useState(false)

  const isCompanyLoad = '_id' in load && 'auctionId' in load
  const auction = isCompanyLoad ? (load as LoadWithDetails).auctionId : null
  const currentPrice = auction && typeof auction === 'object' ? auction.currentPrice : null
  const bidCount = isCompanyLoad ? (load as LoadWithDetails).bidCount : undefined
  const status = load.status as LoadStatus

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="h-4 w-4" />
          <span className="sr-only">Open row menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {/* Summary section */}
        <div className="px-2 py-1.5 text-xs text-muted-foreground space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-medium text-foreground">Route</span>
          </div>
          <p className="truncate">
            {(load as LoadWithDetails).originAddress || (load as Load).originAddress}
            <ChevronRight className="inline h-3 w-3 mx-0.5 opacity-40" />
            {(load as LoadWithDetails).destinationAddress || (load as Load).destinationAddress}
          </p>
          <div className="flex items-center justify-between pt-1">
            <span className="font-medium text-foreground">Price</span>
            <span className="font-semibold">
              {currentPrice != null ? `$${currentPrice.toLocaleString()}` : '—'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium text-foreground">Status</span>
            <StatusBadge status={status} bidCount={bidCount} />
          </div>

          {/* Dynamic fields from mobileDetails prop */}
          {mobileDetails?.map((field, idx) => (
            <div key={idx} className="flex items-center justify-between">
              <span className="font-medium text-foreground">{field.label}</span>
              <span>{field.value}</span>
            </div>
          ))}
        </div>

        {/* Divider */}
        <DropdownMenuSeparator />

        {/* Action buttons passed as children */}
        {children && <div className="p-1">{children}</div>}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function DropdownMenuSeparator() {
  return <div className="my-1 h-px bg-border" />
}
