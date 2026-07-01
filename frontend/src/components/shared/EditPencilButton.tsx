import { Pencil } from 'lucide-react'

import { Button } from '@/components/ui/button'

interface EditPencilButtonProps {
  onClick?: () => void
  title?: string
  ariaLabel?: string
}

export default function EditPencilButton({
  onClick,
  title = 'Edit',
  ariaLabel = 'Edit',
}: EditPencilButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="rounded-full hover:bg-muted"
      onClick={onClick}
      title={title}
      aria-label={ariaLabel}
    >
      <Pencil className="h-4 w-4" />
    </Button>
  )
}
