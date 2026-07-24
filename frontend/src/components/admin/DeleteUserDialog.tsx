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
import { useDeleteAdminUserMutation } from '@/services/adminApi/adminSlice'

interface DeleteUserDialogProps {
  /** The user to delete, or null to keep the dialog closed. */
  user: { _id: string; name: string } | null
  onOpenChange: (open: boolean) => void
  onDeleted?: () => void
}

/**
 * Controlled confirmation dialog for permanently deleting a user account.
 * Destructive and irreversible — the underlying loads/bids/reviews created by
 * the user are left untouched (they reference an id that no longer resolves).
 *
 * Fully controlled by the parent (`user` drives visibility), matching
 * BanUserDialog, so it can be triggered from a row action menu or the detail
 * drawer without nesting a Dialog inside a DropdownMenu.
 */
export default function DeleteUserDialog({ user, onOpenChange, onDeleted }: DeleteUserDialogProps) {
  const [deleteUser, { isLoading, isError, reset }] = useDeleteAdminUserMutation()

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next)
    if (next) reset()
  }

  const handleDelete = async () => {
    if (!user) return
    const result = await deleteUser({ userId: user._id })
    if (!('error' in result)) {
      onOpenChange(false)
      onDeleted?.()
    }
  }

  return (
    <Dialog open={!!user} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Permanently delete {user?.name}?</DialogTitle>
          <DialogDescription>
            This deletes the account and cannot be undone. Consider banning the account instead
            if you may need to reinstate it later.
          </DialogDescription>
        </DialogHeader>

        {isError && (
          <p className="text-sm text-destructive">Could not delete this user. Please try again.</p>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
            {isLoading ? 'Deleting…' : 'Delete Permanently'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
