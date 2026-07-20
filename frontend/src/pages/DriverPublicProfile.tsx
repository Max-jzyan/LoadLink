import DriverInfoCard from '@/components/driverProfile/DriverInfoCard'
import PerformanceCard from '@/components/driverProfile/PerformanceCard'
import Col from '@/components/layout/Col'
import PageShell from '@/components/layout/PageShell'
import Row from '@/components/layout/Row'
import UnifiedReviewForm from '@/components/review/UnifiedReviewForm'
import { ReviewsSection } from '@/components/shared/PublicProfileLayout'
import ReviewCard from '@/components/shared/ReviewCard'
import ForbiddenPage from '@/pages/ForbiddenPage'
import { selectMongoId, selectRole } from '@/services/authSlice'
import { setBreadcrumbLabel } from '@/services/breadcrumbSlice'
import type { RatingCategories } from '@/services/driverApi/driverEnum'
import { useGetDriverProfileQuery } from '@/services/driverApi/driverSlice'
import { useListCompanyLoadsQuery } from '@/services/loadApi/loadSlice'
import {
  useCreateReviewMutation,
  useGetReviewsForTargetQuery,
} from '@/services/reviewApi/reviewSlice'
import { LOAD_STATUSES } from '@/types/enums'
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useParams } from 'react-router-dom'

export default function DriverPublicProfile() {
  const [showReviewForm, setShowReviewForm] = useState(false)
  const currentRole = useSelector(selectRole)
  const currentMongoId = useSelector(selectMongoId)

  const dispatch = useDispatch()

  const { driverId } = useParams<{ driverId?: string }>()

  useEffect(() => {
    if (currentRole === 'driver') {
      dispatch(
        setBreadcrumbLabel({
          path: `/driver/${driverId ?? ''}`,
          label: 'Forbidden',
        })
      )
    }
  }, [currentRole, driverId, dispatch])

  if (currentRole === 'driver') {
    return <ForbiddenPage />
  }

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
    {
      companyId: currentMongoId!,
      assignedDriverId: driverId,
      excludeReviewedBy: currentMongoId!,
      status: LOAD_STATUSES.Completed,
    },
    { skip: !currentMongoId || !driverId }
  )

  const [createReview, { isLoading: isSubmittingReview, isSuccess, isError }] = useCreateReviewMutation()

  // Push the resolved driver name into the breadcrumb store so PageLayout can
  // render a friendly label without re-fetching the entity by id from the URL.
  useEffect(() => {
    if (driverId && driver) {
      dispatch(
        setBreadcrumbLabel({
          path: `/driver/${driverId}`,
          label: driver.name ? `${driver.name}'s Profile` : 'Driver Profile',
        })
      )
    }
  }, [driverId, driver, dispatch])

  useEffect(() => {
    if (isSuccess) {
      setShowReviewForm(false)
    }
  }, [isSuccess])

  useEffect(() => {
    if (isError) {
      // Error toast could be added here; the mutation handles cache invalidation
    }
  }, [isError])

  const handleReviewSubmit = (data: {
    loadId: string
    ratingCategories: RatingCategories
    comment: string
  }) => {
    if (!driverId) return
    createReview({
      reviewerId: currentMongoId!,
      targetId: driverId,
      loadId: data.loadId,
      ratingCategories: data.ratingCategories,
      comment: data.comment,
    })
  }

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

  let reviewsBody: React.ReactNode
  if (isReviewsLoading) {
    reviewsBody = (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    )
  } else if (isReviewsError) {
    reviewsBody = (
      <div className="text-sm text-destructive">Could not load reviews. Please try again later.</div>
    )
  } else if ((reviewsPayload?.data ?? []).length === 0) {
    reviewsBody = (
      <div className="text-sm text-muted-foreground italic">No reviews yet for this driver.</div>
    )
  } else {
    reviewsBody = (
      <div className="space-y-3">
        {(reviewsPayload?.data ?? []).map((r) => (
          <ReviewCard key={r._id} review={r} reviewerType="company" />
        ))}
      </div>
    )
  }

  const leftColumnContent = (
    <>
      <Col size={16}>
        <DriverInfoCard driver={driver} />
      </Col>
    </>
  )

  const rightColumnContent = (
    <>
      <Col size={16}>
        <PerformanceCard driver={driver} />
      </Col>
    </>
  )

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
          <Row>{leftColumnContent}</Row>
          <Row>{rightColumnContent}</Row>
        </Col>

        <Col size={12}>
          <Row>
            <Col size={16}>
              <ReviewsSection
                totalReviews={reviewsPayload?.pagination.total}
                isAuthorized={currentRole === 'company'}
                onWriteReview={() => setShowReviewForm(true)}
                loadsCount={companyLoads?.length ?? 0}
                disabledTooltip="You can only review this driver after they have completed a load for your company"
              >
                {reviewsBody}
              </ReviewsSection>
            </Col>
          </Row>
        </Col>
      </Row>

      {showReviewForm && (
        <UnifiedReviewForm
          targetName={driver.name ?? 'this driver'}
          targetType="driver"
          loads={companyLoads ?? []}
          onSubmit={handleReviewSubmit}
          onCancel={() => setShowReviewForm(false)}
          isSubmitting={isSubmittingReview}
        />
      )}
    </PageShell>
  )
}
