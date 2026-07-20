import DynamicCard from '@/components/layout/DynamicCard'
import { categoryLabels, type RatingCategories } from '@/services/driverApi/driverEnum'
import { RATING_CATEGORIES_COUNT } from '@/services/driverApi/driverEnum'
import StarRating from '@/components/shared/StarRating'
import DriverNameLink from '@/components/shared/DriverNameLink'
import CompanyNameLink from '@/components/shared/CompanyNameLink'
import type { Review } from '@/services/reviewApi/reviewEnum'
import { Skeleton } from '@/components/ui/skeleton'

export function ReviewCardSkeleton() {
  return (
    <DynamicCard noPadding={false} title={<Skeleton className="h-4 w-40" />}>
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-8" />
          </div>
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-3 w-56" />
        <div className="space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
        </div>
        <div className="border-t pt-3 space-y-2">
          <Skeleton className="h-3 w-32" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-8" />
            </div>
          ))}
        </div>
      </div>
    </DynamicCard>
  )
}

export function averageFromCategories(categories: RatingCategories): number {
  const sum =
    categories.timeliness +
    categories.communication +
    categories.reliability +
    categories.professionalism +
    categories.documentationAccuracy
  return sum / RATING_CATEGORIES_COUNT
}

interface ReviewCardProps {
  review: Review
  reviewerType: 'driver' | 'company'
}

export default function ReviewCard({ review, reviewerType }: ReviewCardProps) {
  const avg = averageFromCategories(review.ratingCategories)
  const reviewerName = review.reviewerId?.name ?? 'Anonymous'
  const reviewerId = review.reviewerId?._id

  const renderReviewerName = () => {
    if (!reviewerId) {
      return reviewerName
    }
    if (reviewerType === 'driver') {
      return <DriverNameLink name={reviewerName} driverId={reviewerId} />
    }
    return <CompanyNameLink name={reviewerName} companyId={reviewerId} />
  }

  return (
    <DynamicCard noPadding={false} title={renderReviewerName()}>
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <StarRating value={avg} />
            <span className="text-sm font-semibold">{avg.toFixed(1)}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            {new Date(review.createdAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </div>
        </div>

        {review.loadId?.originAddress && review.loadId?.destinationAddress && (
          <div className="text-sm text-muted-foreground">
            {review.loadId.originAddress} → {review.loadId.destinationAddress}
          </div>
        )}

        {review.comment?.trim() ? (
          <div className="whitespace-pre-wrap text-sm">{review.comment}</div>
        ) : (
          <div className="text-sm text-muted-foreground italic">No comment provided.</div>
        )}

        <div className="border-t pt-3 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Category breakdown</p>
          {categoryLabels.map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{label}</span>
              <span className="font-medium">{review.ratingCategories[key].toFixed(1)}</span>
            </div>
          ))}
        </div>
      </div>
    </DynamicCard>
  )
}
