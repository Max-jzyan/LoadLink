import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

interface SeparatorWithTextProps {
  className?: string
  text?: string
}

function SeparatorWithText({ className, text = 'or submit a higher bid' }: SeparatorWithTextProps) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <Separator className="flex-1" />
      <span className="text-muted-foreground text-xs shrink-0">{text}</span>
      <Separator className="flex-1" />
    </div>
  )
}

export { SeparatorWithText, type SeparatorWithTextProps }
