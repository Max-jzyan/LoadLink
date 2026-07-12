import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Loader2, X } from 'lucide-react'
import { type ReactNode } from 'react'

type DrawerSize = 'sm' | 'md' | 'lg'

const sizeClasses: Record<DrawerSize, string> = {
  sm: 'w-96',
  md: 'w-[500px]',
  lg: 'w-[700px]',
}

interface DrawerShellProps {
  /** Drawer visibility state */
  open: boolean
  /** State setter function */
  onOpenChange: (open: boolean) => void
  /** Drawer title */
  title: string
  /** Optional description/subtitle */
  description?: string
  /** Size variant: sm (384px), md (500px), lg (700px) */
  size?: DrawerSize
  /** Main content */
  children: ReactNode
  /** Optional footer content (typically action buttons) */
  footer?: ReactNode
  /** Standard form submit footer: Close + Save buttons */
  drawerSubmit?: {
    onSubmit: () => void
    submitLabel?: string
    cancelLabel?: string
    isSubmitting?: boolean
  }
  /** Show close (X) button in top-right corner */
  showCloseButton?: boolean
  /** Drawer direction */
  direction?: 'top' | 'bottom' | 'left' | 'right'
}

/**
 * DrawerShell provides a consistent structure for drawer components.
 *
 * Features:
 * - Size variants (sm, md, lg)
 * - Close button in top-right corner
 * - Modal mode enabled by default (prevents closing on portal clicks)
 * - Scrollable content area
 * - Optional footer for actions
 * - Standard form submit footer via `drawerSubmit`
 *
 * @example
 * <DrawerShell
 *   open={open}
 *   onOpenChange={setOpen}
 *   title="Edit Item"
 *   description="Make changes to your item"
 *   size="md"
 *   footer={<Button>Save</Button>}
 * >
 *   <form>...</form>
 * </DrawerShell>
 *
 * @example
 * <DrawerShell
 *   open={open}
 *   onOpenChange={setOpen}
 *   title="Edit Item"
 *   drawerSubmit={{ onSubmit: handleSave, isSubmitting }}
 * >
 *   <form>...</form>
 * </DrawerShell>
 */
export default function DrawerShell({
  open,
  onOpenChange,
  title,
  description,
  size = 'md',
  children,
  footer,
  drawerSubmit,
  showCloseButton = true,
  direction = 'right',
}: DrawerShellProps) {
  const resolvedFooter = drawerSubmit
    ? drawerSubmit.cancelLabel === '' && drawerSubmit.submitLabel === 'Close'
      ? (
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={drawerSubmit.isSubmitting}
          >
            Close
          </Button>
        )
      : (
          <>
            <Button
              type="submit"
              onClick={drawerSubmit.onSubmit}
              disabled={drawerSubmit.isSubmitting}
            >
              {drawerSubmit.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {drawerSubmit.submitLabel ?? 'Save'}
            </Button>
            {drawerSubmit.cancelLabel !== '' && (
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={drawerSubmit.isSubmitting}
              >
                {drawerSubmit.cancelLabel ?? 'Cancel'}
              </Button>
            )}
          </>
        )
    : footer

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction={direction} modal>
      <DrawerContent className={sizeClasses[size]}>
        <DrawerHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DrawerTitle>{title}</DrawerTitle>
              <DrawerDescription className={description ? undefined : "sr-only"}>
                {description ?? "Drawer content panel"}
              </DrawerDescription>
            </div>
            {showCloseButton && (
              <DrawerClose asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted">
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </Button>
              </DrawerClose>
            )}
          </div>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-4">{children}</div>

        {resolvedFooter && <DrawerFooter>{resolvedFooter}</DrawerFooter>}
      </DrawerContent>
    </Drawer>
  )
}