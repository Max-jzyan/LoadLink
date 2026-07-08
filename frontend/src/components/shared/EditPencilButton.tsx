import { Pencil } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface EditPencilButtonProps {
  onClick?: () => void
  title?: string
  ariaLabel?: string
  className?: string
}

export default function EditPencilButton({
  onClick,
  title = 'Edit',
  ariaLabel = 'Edit',
  className,
}: EditPencilButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn('rounded-full hover:bg-muted', className)}
      onClick={onClick}
      title={title}
      aria-label={ariaLabel}
    >
      <Pencil className="h-4 w-4" />
    </Button>
  )
}
