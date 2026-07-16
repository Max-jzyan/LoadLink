import DynamicCard from '@/components/layout/DynamicCard'
import { categoryLabels, type RatingCategories } from '@/services/driverApi/driverEnum'
import { RATING_CATEGORIES_COUNT } from '@/services/driverApi/driverEnum'
import StarRating from '@/components/shared/StarRating'
import type { Review } from '@/services/reviewApi/reviewEnum'

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
}

export default function ReviewCard({ review }: ReviewCardProps) {
  const avg = averageFromCategories(review.ratingCategories)
  return (
    <DynamicCard noPadding={false} title={review.reviewerId?.name ?? 'Anonymous'}>
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