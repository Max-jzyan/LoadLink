import type { CompanyInfoFormValues } from '@/components/companyProfile/CompanyInfoDrawer'
import CompanyInfoCard from '@/components/companyProfile/CompanyInfoCard'
import CompanyInfoDrawer from '@/components/companyProfile/CompanyInfoDrawer'
import BusinessDocumentsCard from '@/components/companyProfile/BusinessDocumentsCard'
import NotificationPreferencesCard from '@/components/driverProfile/NotificationPreferencesCard'
import CompanyPerformanceCard from '@/components/companyProfile/CompanyPerformanceCard'
import { ReviewsSection } from '@/components/shared/PublicProfileLayout'
import ReviewCard from '@/components/shared/ReviewCard'
import Col from '@/components/layout/Col'
import PageShell from '@/components/layout/PageShell'
import Row from '@/components/layout/Row'
import { useRequiredMongoId } from '@/hooks/useAuth'
import {
  useGetCompanyProfileQuery,
  useUpdateCompanyProfileMutation,
} from '@/services/companyApi/companyApi'
import { useGetReviewsForTargetQuery } from '@/services/reviewApi/reviewSlice'
import { Loader2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

type ProfileTab = 'profile' | 'reviews'

export default function CompanyProfile() {
  const companyId = useRequiredMongoId()
  const [activeTab, setActiveTab] = useState<ProfileTab>('profile')
  const { data: company, isLoading, isError } = useGetCompanyProfileQuery(companyId)

  const {
    data: reviewsPayload,
    isSuccess: isReviewsSuccess,
    isLoading: isReviewsLoading,
    isError: isReviewsError,
  } = useGetReviewsForTargetQuery(
    { targetId: companyId, page: 1, limit: 20 },
    { skip: !companyId || activeTab !== 'reviews' }
  )

  const [updateCompanyProfile, { isSuccess: infoSaved }] = useUpdateCompanyProfileMutation()

  // Company info drawer state
  const [infoDrawerOpen, setInfoDrawerOpen] = useState(false)

  // Close drawer when update succeeds
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (infoSaved) setInfoDrawerOpen(false)
  }, [infoSaved])

  const handleCompanyInfoSubmit = useCallback(
    (values: CompanyInfoFormValues) => {
      updateCompanyProfile({
        companyId,
        body: {
          companyName: values.companyName,
          contactName: values.contactName,
          businessAddress: values.businessAddress,
          businessNumber: values.businessNumber,
          profilePictureUrl: values.profilePictureUrl,
          businessDocuments: values.businessDocuments,
        },
      })
    },
    [companyId, updateCompanyProfile]
  )

  if (isLoading) {
    return (
      <PageShell title="My Company Profile">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PageShell>
    )
  }

  if (isError || !company) {
    return (
      <PageShell title="My Company Profile">
        <div className="flex items-center justify-center py-20 text-destructive">
          Failed to load profile. Please try again later.
        </div>
      </PageShell>
    )
  }

  const reviewsBody = (() => {
    if (isReviewsLoading) {
      return (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
        </div>
      )
    }
    if (isReviewsError) {
      return (
        <div className="text-sm text-destructive">
          Could not load reviews. Please try again later.
        </div>
      )
    }
    if (isReviewsSuccess) {
      if (reviewsPayload.data.length === 0) {
        return (
          <div className="text-sm text-muted-foreground italic">
            No reviews yet for your company.
          </div>
        )
      }
      return (
        <div className="space-y-3">
          {reviewsPayload.data.map((r) => (
            <ReviewCard key={r._id} review={r} reviewerType="driver" />
          ))}
        </div>
      )
    }
    // Skipped or no data yet
    return null
  })()

  return (
    <PageShell
      title="My Company Profile"
      tabs={{
        options: [
          { value: 'profile', label: 'Profile' },
          { value: 'reviews', label: 'Reviews' },
        ],
        value: activeTab,
        onValueChange: (value) => setActiveTab(value as ProfileTab),
        searchParamKey: 'tab',
      }}
    >
      {activeTab === 'profile' ? (
        <Row>
          {/* Column 1 — 25% */}
          <Col size={4}>
            <Row>
              <Col size={16}>
                <CompanyInfoCard company={company} onEdit={() => setInfoDrawerOpen(true)} />
              </Col>
            </Row>
            <Row>
              <Col size={16}>
                <CompanyPerformanceCard company={company} />
              </Col>
            </Row>
          </Col>

          {/* Column 2 — 75% */}
          <Col size={12}>
            <Row>
              <Col size={16}>
                <BusinessDocumentsCard
                  documents={company.businessDocuments ?? []}
                  onEdit={() => setInfoDrawerOpen(true)}
                />
              </Col>
            </Row>
            <Row>
              <Col size={16}>
                <NotificationPreferencesCard
                  notificationPreferences={company.notificationPreferences}
                />
              </Col>
            </Row>
          </Col>
        </Row>
      ) : (
        <Row>
          <Col size={16}>
            <ReviewsSection
              totalReviews={reviewsPayload?.pagination.total}
              isAuthorized={false}
              onWriteReview={() => {}}
              loadsCount={0}
            >
              {reviewsBody}
            </ReviewsSection>
          </Col>
        </Row>
      )}

      {/* Company Info Edit Drawer */}
      <CompanyInfoDrawer
        open={infoDrawerOpen}
        onOpenChange={setInfoDrawerOpen}
        company={company}
        onSubmit={handleCompanyInfoSubmit}
      />
    </PageShell>
  )
}
