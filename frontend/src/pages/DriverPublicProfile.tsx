import { useState } from 'react'
import DriverInfoCard from '@/components/driverProfile/DriverInfoCard'
import PerformanceCard from '@/components/driverProfile/PerformanceCard'
import ReviewForm from '@/components/review/ReviewForm'
import Col from '@/components/layout/Col'
import DynamicCard from '@/components/layout/DynamicCard'
import PageShell from '@/components/layout/PageShell'
import Row from '@/components/layout/Row'
import { useGetDriverProfileQuery } from '@/services/driverApi/driverSlice'
import { useListCompanyLoadsQuery } from '@/services/loadApi/loadSlice'
import {
  useGetReviewsForTargetQuery,
  useCreateReviewMutation,
} from '@/services/reviewApi/reviewSlice'
import { useSelector } from 'react-redux'
import { selectRole, selectMongoId } from '@/services/authSlice'
import { Loader2, Plus } from 'lucide-react'
import { useParams } from 'react-router-dom'
import StarRating from '@/components/shared/StarRating'
import {
  categoryLabels,
  type RatingCategories,
  RATING_CATEGORIES_COUNT,
} from '@/services/driverApi/driverEnum'
import type { Review } from '@/services/reviewApi/reviewEnum'

function averageFromCategories(categories: RatingCategories): number {
  const sum =
    categories.timeliness +
    categories.communication +
    categories.reliability +
    categories.professionalism +
    categories.documentationAccuracy
  return sum / RATING_CATEGORIES_COUNT
}

function ReviewCard({ review }: { review: Review }) {
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

export default function DriverPublicProfile() {
  const [showReviewForm, setShowReviewForm] = useState(false)
  const currentRole = useSelector(selectRole)
  const currentMongoId = useSelector(selectMongoId)

  const { driverId } = useParams<{ driverId?: string }>()

  const {
    data: driver,
    isLoading: isDriverLoading,
    isError: isDriverError,
  } = useGetDriverProfileQuery(driverId!, { skip: !driverId })

  const {
    data: reviewsPayload,
    isLoading: isReviewsLoading,
    isError: isReviewsError,
  } = useGetReviewsForTargetQuery({ targetId: driverId!, page: 1, limit: 20 }, { skip: !driverId })

  const { data: companyLoads } = useListCompanyLoadsQuery(
    { companyId: currentMongoId!, assignedDriverId: driverId, excludeReviewedBy: currentMongoId! },
    { skip: !currentMongoId || !driverId }
  )

  const [createReview, { isLoading: isSubmittingReview }] = useCreateReviewMutation()

  if (!driverId) {
    return (
      <PageShell title="Driver Profile">
        <div className="flex items-center justify-center py-20 text-destructive">
          Missing driver ID.
        </div>
      </PageShell>
    )
  }

  if (isDriverLoading) {
    return (
      <PageShell title="Driver Profile">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PageShell>
    )
  }

  if (isDriverError || !driver) {
    return (
      <PageShell title="Driver Profile">
        <div className="flex items-center justify-center py-20 text-destructive">
          Failed to load driver profile.
        </div>
      </PageShell>
    )
  }

  const reviews = reviewsPayload?.data ?? []

  let reviewsBody
  if (isReviewsLoading) {
    reviewsBody = (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    )
  } else if (isReviewsError) {
    reviewsBody = (
      <div className="text-sm text-destructive">
        Could not load reviews. Please try again later.
      </div>
    )
  } else if (reviews.length === 0) {
    reviewsBody = (
      <div className="text-sm text-muted-foreground italic">No reviews yet for this driver.</div>
    )
  } else {
    reviewsBody = (
      <div className="space-y-3">
        {reviews.map((r) => (
          <ReviewCard key={r._id} review={r} />
        ))}
      </div>
    )
  }

  return (
    <PageShell
      title={driver.name ? `${driver.name}'s Profile` : 'Driver Profile'}
      subtitle={
        driver.ratingSummary?.totalReviews
          ? `${driver.ratingSummary.totalReviews} reviews`
          : undefined
      }
    >
      <Row>
        <Col size={4}>
          <Row>
            <Col size={16}>
              <DriverInfoCard driver={driver} />
            </Col>
          </Row>
          <Row>
            <Col size={16}>
              <PerformanceCard driver={driver} />
            </Col>
          </Row>
        </Col>

        <Col size={12}>
          <Row>
            <Col size={16}>
              <DynamicCard
                title={
                  reviewsPayload?.pagination
                    ? `Ratings & Reviews (${reviewsPayload.pagination.total})`
                    : 'Ratings & Reviews'
                }
                action={
                  currentRole === 'company' ? (
                    <button
                      type="button"
                      onClick={() => setShowReviewForm(true)}
                      className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Write a Review
                    </button>
                  ) : undefined
                }
              >
                <div className="p-4">{reviewsBody}</div>
              </DynamicCard>
            </Col>
          </Row>
        </Col>
      </Row>

      {showReviewForm && (
        <ReviewForm
          driverName={driver.name ?? 'this driver'}
          loads={companyLoads ?? []}
          onSubmit={async (data) => {
            try {
              await createReview({
                reviewerId: currentMongoId!,
                targetId: driverId,
                loadId: data.loadId,
                ratingCategories: data.ratingCategories,
                comment: data.comment,
              }).unwrap()
              setShowReviewForm(false)
            } catch {
              // Error toast could be added here; the mutation handles cache invalidation
            }
          }}
          onCancel={() => setShowReviewForm(false)}
          isSubmitting={isSubmittingReview}
        />
      )}
    </PageShell>
  )
}
