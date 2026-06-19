import { useState } from 'react'
import { HelpCircle } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { zIndex } from '@/lib/zIndex'

interface InfoIconPopoverProps {
  title: string
  description: string
  iconClassName?: string
}

export function InfoIconPopover({
  title,
  description,
  iconClassName = 'w-5 h-5 text-gray-500 hover:text-gray-700 cursor-help',
}: InfoIconPopoverProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <HelpCircle
          className={iconClassName}
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
        />
      </PopoverTrigger>
      <PopoverContent
        side="top"
        className="w-80"
        style={{ zIndex: zIndex.popover }}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
      >
        <div className="space-y-2">
          <h4 className="font-medium text-sm">{title}</h4>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </PopoverContent>
    </Popover>
  )
}
