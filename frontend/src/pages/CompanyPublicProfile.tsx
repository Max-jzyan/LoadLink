import { useState, useEffect } from 'react'
import CompanyInfoCard from '@/components/companyProfile/CompanyInfoCard'
import CompanyPerformanceCard from '@/components/companyProfile/CompanyPerformanceCard'
import Col from '@/components/layout/Col'
import PageShell from '@/components/layout/PageShell'
import Row from '@/components/layout/Row'
import { useGetCompanyProfileQuery } from '@/services/companyApi/companyApi'
import { useListDriverCompletedLoadsForCompanyQuery } from '@/services/driverApi/driverSlice'
import {
  useGetReviewsForTargetQuery,
  useCreateReviewMutation,
} from '@/services/reviewApi/reviewSlice'
import { useSelector, useDispatch } from 'react-redux'
import { selectRole, selectMongoId } from '@/services/authSlice'
import { setBreadcrumbLabel } from '@/services/breadcrumbSlice'
import { Loader2 } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { ReviewsSection } from '@/components/shared/PublicProfileLayout'
import ReviewCard from '@/components/shared/ReviewCard'
import UnifiedReviewForm from '@/components/review/UnifiedReviewForm'
import ForbiddenPage from '@/pages/ForbiddenPage'
import type { RatingCategories } from '@/services/driverApi/driverEnum'

export default function CompanyPublicProfile() {
  const [showReviewForm, setShowReviewForm] = useState(false)
  const currentRole = useSelector(selectRole)
  const currentMongoId = useSelector(selectMongoId)

  const dispatch = useDispatch()

  const { companyId } = useParams<{ companyId?: string }>()

  useEffect(() => {
    if (currentRole === 'company') {
      dispatch(
        setBreadcrumbLabel({
          path: `/company/${companyId ?? ''}`,
          label: 'Forbidden',
        })
      )
    }
  }, [currentRole, companyId, dispatch])

  if (currentRole === 'company') {
    return <ForbiddenPage />
  }

  const {
    data: company,
    isLoading: isCompanyLoading,
    isError: isCompanyError,
  } = useGetCompanyProfileQuery(companyId!, { skip: !companyId })

  const {
    data: reviewsPayload,
    isLoading: isReviewsLoading,
    isError: isReviewsError,
  } = useGetReviewsForTargetQuery(
    { targetId: companyId!, page: 1, limit: 20 },
    { skip: !companyId }
  )

  const { data: driverLoads } = useListDriverCompletedLoadsForCompanyQuery(
    {
      driverId: currentMongoId!,
      companyId: companyId!,
    },
    { skip: !currentMongoId || !companyId }
  )

  const [createReview, { isLoading: isSubmittingReview }] = useCreateReviewMutation()

  // Push the resolved company name into the breadcrumb store so PageLayout can
  // render a friendly label without re-fetching the entity by id from the URL.
  useEffect(() => {
    if (companyId && company) {
      const name = company.companyName || company.name
      dispatch(
        setBreadcrumbLabel({
          path: `/company/${companyId}`,
          label: name ? `${name}'s Profile` : 'Company Profile',
        })
      )
    }
  }, [companyId, company, dispatch])

  if (!companyId) {
    return (
      <PageShell title="Company Profile">
        <div className="flex items-center justify-center py-20 text-destructive">
          Missing company ID.
        </div>
      </PageShell>
    )
  }

  const handleReviewSubmit = async (data: {
    loadId: string
    ratingCategories: RatingCategories
    comment: string
  }) => {
    try {
      await createReview({
        reviewerId: currentMongoId!,
        targetId: companyId!,
        loadId: data.loadId,
        ratingCategories: data.ratingCategories,
        comment: data.comment,
        targetType: 'company',
      }).unwrap()
      setShowReviewForm(false)
    } catch {
      // Error handling managed by mutation
    }
  }

  const displayName = company?.companyName || company?.name

  if (isCompanyLoading) {
    return (
      <PageShell title="Company Profile">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PageShell>
    )
  }

  if (isCompanyError || !company) {
    return (
      <PageShell title="Company Profile">
        <div className="flex items-center justify-center py-20 text-destructive">
          Failed to load company profile.
        </div>
      </PageShell>
    )
  }

  const reviewsBody = isReviewsLoading ? (
    <div className="flex items-center justify-center py-10">
      <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
    </div>
  ) : isReviewsError ? (
    <div className="text-sm text-destructive">Could not load reviews. Please try again later.</div>
  ) : (reviewsPayload?.data ?? []).length === 0 ? (
    <div className="text-sm text-muted-foreground italic">No reviews yet for this company.</div>
  ) : (
    <div className="space-y-3">
      {(reviewsPayload?.data ?? []).map((r) => (
        <ReviewCard key={r._id} review={r} reviewerType="driver" />
      ))}
    </div>
  )

  const leftColumnContent = (
    <>
      <Col size={16}>
        <CompanyInfoCard company={company} />
      </Col>
    </>
  )

  const rightColumnContent = (
    <>
      <Col size={16}>
        <CompanyPerformanceCard company={company} />
      </Col>
    </>
  )

  return (
    <PageShell
      title={displayName ? `${displayName}'s Profile` : 'Company Profile'}
      subtitle={
        company.ratingSummary?.totalReviews
          ? `${company.ratingSummary.totalReviews} reviews`
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
                isAuthorized={currentRole === 'driver'}
                onWriteReview={() => setShowReviewForm(true)}
                loadsCount={driverLoads?.length ?? 0}
                disabledTooltip="You can only review this company after completing a load for them"
              >
                {reviewsBody}
              </ReviewsSection>
            </Col>
          </Row>
        </Col>
      </Row>

      {showReviewForm && (
        <UnifiedReviewForm
          targetName={displayName ?? 'this company'}
          targetType="company"
          loads={driverLoads ?? []}
          onSubmit={handleReviewSubmit}
          onCancel={() => setShowReviewForm(false)}
          isSubmitting={isSubmittingReview}
        />
      )}
    </PageShell>
  )
}
