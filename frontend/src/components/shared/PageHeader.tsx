import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PageHeaderProps {
  /** Total item count — used for the left-side label */
  count?: number
  /** Singular noun for the item, e.g. "load" or "truck" */
  noun?: string
  /** Label shown when count === 0 */
  emptyLabel?: string
  /** Whether data is still loading (hides the count while loading) */
  isLoading?: boolean
  /** Button label, e.g. "Post Load" */
  actionLabel?: string
  /** React Router path the action button links to */
  actionTo?: string
  /** Optional text rendered in the centre of the header */
  middleText?: string
}

/**
 * Compact page-level header with a count label on the left and a
 * primary "create" action button on the right.
 *
 * @example
 * <PageHeader count={loads.length} noun="load" actionLabel="Post Load" actionTo={RoutePath.PostLoad} middleText={companyId} />
 */
export function PageHeader({
  count,
  noun,
  emptyLabel,
  isLoading,
  actionLabel,
  actionTo,
  middleText,
}: PageHeaderProps) {
  const showCount = !isLoading && count != null

  const countLabel = (() => {
    if (count === 0) return emptyLabel ?? (noun ? `No ${noun}s yet` : 'No items yet')
    if (noun) return `${count} ${noun}${count !== 1 ? 's' : ''}`
    return String(count)
  })()

  return (
    <div className="flex items-center justify-between gap-4">
      {showCount ? <p className="text-sm text-muted-foreground">{countLabel}</p> : <span />}

      {middleText && <p>{middleText}</p>}

      {actionLabel && actionTo && (
        <Button asChild size="sm">
          <Link to={actionTo}>
            <Plus className="mr-1.5 h-4 w-4" />
            {actionLabel}
          </Link>
        </Button>
      )}
    </div>
  )
}
