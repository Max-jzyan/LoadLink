import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useBanUserMutation } from '@/services/adminApi/adminSlice'

interface BanUserDialogProps {
  /** The user to ban, or null to keep the dialog closed. */
  user: { _id: string; name: string } | null
  onOpenChange: (open: boolean) => void
}

/**
 * Controlled confirmation dialog for suspending a user's account. Requires an
 * optional reason that gets stored on the user record and surfaced to them
 * via notification, so the moderation trail is auditable.
 *
 * Fully controlled by the parent (`user` drives visibility) so it can be
 * triggered from multiple places — a row action menu or the detail drawer —
 * without nesting a Dialog inside a DropdownMenu.
 */
export default function BanUserDialog({ user, onOpenChange }: BanUserDialogProps) {
  const [banUser, { isLoading, isError, reset }] = useBanUserMutation()
  const [reason, setReason] = useState('')

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      reset()
      setReason('')
    }
    onOpenChange(next)
  }

  const handleBan = async () => {
    if (!user) return
    const result = await banUser({ userId: user._id, reason: reason.trim() || undefined })
    if (!('error' in result)) handleOpenChange(false)
  }

  return (
    <Dialog open={!!user} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ban {user?.name}?</DialogTitle>
          <DialogDescription>
            This immediately blocks the account from signing in. The user will be notified.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="ban-reason">Reason (optional, visible to the user)</Label>
          <Textarea
            id="ban-reason"
            placeholder="e.g. Repeated fraudulent bids on multiple loads"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />
        </div>

        {isError && (
          <p className="text-sm text-destructive">Could not ban this user. Please try again.</p>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button variant="destructive" onClick={handleBan} disabled={isLoading}>
            {isLoading ? 'Banning…' : 'Ban User'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
