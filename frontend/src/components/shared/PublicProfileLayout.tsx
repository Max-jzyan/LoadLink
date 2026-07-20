import { Plus } from 'lucide-react'
import Col from '@/components/layout/Col'
import DynamicCard from '@/components/layout/DynamicCard'
import PageShell from '@/components/layout/PageShell'
import Row from '@/components/layout/Row'
import { Skeleton } from '@/components/ui/skeleton'
import type { ReactNode } from 'react'

interface ReviewsSectionProps {
  totalReviews: number | undefined
  isAuthorized: boolean
  onWriteReview: () => void
  loadsCount: number
  disabledTooltip?: string
  children: ReactNode
}

export function ReviewsSection({
  totalReviews,
  isAuthorized,
  onWriteReview,
  loadsCount,
  disabledTooltip,
  children,
}: ReviewsSectionProps) {
  return (
    <DynamicCard
      title={totalReviews ? `Ratings & Reviews (${totalReviews})` : 'Ratings & Reviews'}
      action={
        isAuthorized ? (
          <button
            type="button"
            onClick={onWriteReview}
            disabled={!loadsCount}
            title={loadsCount ? undefined : disabledTooltip}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" />
            Write a Review
          </button>
        ) : undefined
      }
    >
      <div className="p-4">{children}</div>
    </DynamicCard>
  )
}

interface PublicProfileLayoutProps {
  title: string
  subtitle?: string
  isLoading: boolean
  isError: boolean
  leftColumnContent: ReactNode
  rightColumnContent: ReactNode
  reviewsSection: ReactNode
}

export default function PublicProfileLayout({
  title,
  subtitle,
  isLoading,
  isError,
  leftColumnContent,
  rightColumnContent,
  reviewsSection,
}: PublicProfileLayoutProps) {
  if (isLoading) {
    return (
      <PageShell title={title}>
        <Row>
          <Col size={4}>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-16 w-16 rounded-full shrink-0" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-3 w-56" />
                </div>
              </div>
              <Skeleton className="h-24 w-full rounded-lg" />
              <div className="grid grid-cols-2 gap-2">
                <Skeleton className="h-16 rounded-lg" />
                <Skeleton className="h-16 rounded-lg" />
              </div>
            </div>
            <div className="mt-6 space-y-3">
              <Skeleton className="h-4 w-32" />
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          </Col>

          <Col size={12}>
            <Skeleton className="h-6 w-48 mb-3" />
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-40 w-full rounded-lg" />
              ))}
            </div>
          </Col>
        </Row>
      </PageShell>
    )
  }

  if (isError) {
    return (
      <PageShell title={title}>
        <div className="flex items-center justify-center py-20 text-destructive">
          Failed to load profile.
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell title={title} subtitle={subtitle}>
      <Row>
        <Col size={4}>
          <Row>
            <Col size={16}>{leftColumnContent}</Col>
          </Row>
          <Row>
            <Col size={16}>{rightColumnContent}</Col>
          </Row>
        </Col>

        <Col size={12}>
          <Row>
            <Col size={16}>{reviewsSection}</Col>
          </Row>
        </Col>
      </Row>
    </PageShell>
  )
}
