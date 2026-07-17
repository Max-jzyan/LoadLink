import type { ContactFormValues } from '@/components/driverProfile/ContactInfoCard'
import ContactInfoCard from '@/components/driverProfile/ContactInfoCard'
import DriverInfoCard from '@/components/driverProfile/DriverInfoCard'
import type { DriverInfoFormValues } from '@/components/driverProfile/DriverInfoDrawer'
import DriverInfoDrawer from '@/components/driverProfile/DriverInfoDrawer'
import NotificationPreferencesCard from '@/components/driverProfile/NotificationPreferencesCard'
import PerformanceCard from '@/components/driverProfile/PerformanceCard'
import type { PricingFormValues } from '@/components/driverProfile/PricingPreferencesCard'
import PricingPreferencesCard from '@/components/driverProfile/PricingPreferencesCard'
import ScoreWeightsCard from '@/components/driverProfile/ScoreWeightsCard'
import ScoreWeightsDrawer from '@/components/driverProfile/ScoreWeightsDrawer'
import type { TruckFormValues } from '@/components/driverProfile/TruckDrawer'
import TruckDrawer from '@/components/driverProfile/TruckDrawer'
import TruckInfoCard from '@/components/driverProfile/TruckInfoCard'
import TrailerInfoCard from '@/components/driverProfile/TrailerInfoCard'
import TrailerDrawer, { type TrailerFormValues } from '@/components/driverProfile/TrailerDrawer'
import { ReviewsSection } from '@/components/shared/PublicProfileLayout'
import ReviewCard from '@/components/shared/ReviewCard'
import Col from '@/components/layout/Col'
import PageShell from '@/components/layout/PageShell'
import Row from '@/components/layout/Row'
import { useRequiredMongoId } from '@/hooks/useAuth'
import type { ScoreWeights, Trailer, Truck } from '@/services/driverApi/driverEnum'
import {
  useCreateTruckMutation,
  useGetDriverProfileQuery,
  useUpdateDriverProfileMutation,
  useUpdateTruckMutation,
  useUpdateTruckExpensesMutation,
} from '@/services/driverApi/driverSlice'
import {
  useListDriverTrailersQuery,
  useCreateTrailerMutation,
  useUpdateTrailerMutation,
} from '@/services/trailerApi/trailerSlice'
import { useGetReviewsForTargetQuery } from '@/services/reviewApi/reviewSlice'
import { Loader2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

type ProfileTab = 'profile' | 'reviews'

export default function DriverProfile() {
  const driverId = useRequiredMongoId()
  const [activeTab, setActiveTab] = useState<ProfileTab>('profile')

  const { data: driver, isLoading } = useGetDriverProfileQuery(driverId)

  const { data: trailers = [] } = useListDriverTrailersQuery(driverId, { skip: !driverId })

  const {
    data: reviewsPayload,
    isSuccess: isReviewsSuccess,
    isLoading: isReviewsLoading,
    isError: isReviewsError,
  } = useGetReviewsForTargetQuery(
    { targetId: driverId, page: 1, limit: 20 },
    { skip: !driverId || activeTab !== 'reviews' }
  )

  const [updateDriverProfile] = useUpdateDriverProfileMutation()
  const [updateDriverProfileForInfo, { isSuccess: infoSaved }] = useUpdateDriverProfileMutation()
  const [createTruck] = useCreateTruckMutation()
  const [updateTruck] = useUpdateTruckMutation()
  const [updateTruckExpenses] = useUpdateTruckExpensesMutation()
  const [createTrailer, { isSuccess: trailerCreated, isLoading: isCreatingTrailer }] =
    useCreateTrailerMutation()
  const [updateTrailer, { isSuccess: trailerUpdated, isLoading: isUpdatingTrailer }] =
    useUpdateTrailerMutation()

  // Truck drawer state
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editTruck, setEditTruck] = useState<Truck | null>(null)

  // Trailer drawer state
  const [trailerDrawerOpen, setTrailerDrawerOpen] = useState(false)
  const [editTrailer, setEditTrailer] = useState<Trailer | null>(null)

  // Driver info drawer state
  const [driverInfoDrawerOpen, setDriverInfoDrawerOpen] = useState(false)

  // Score weights drawer state
  const [scoreWeightsDrawerOpen, setScoreWeightsDrawerOpen] = useState(false)

  // Close driver info drawer when profile update succeeds
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (infoSaved) setDriverInfoDrawerOpen(false)
  }, [infoSaved])

  // Close trailer drawer when create or update succeeds
  useEffect(() => {
    if (trailerCreated || trailerUpdated) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTrailerDrawerOpen(false)
      setEditTrailer(null)
    }
  }, [trailerCreated, trailerUpdated])

  const handleAddTruck = useCallback(() => {
    setEditTruck(null)
    setDrawerOpen(true)
  }, [])

  const handleTruckDrawerOpenChange = useCallback((nextOpen: boolean) => {
    setDrawerOpen(nextOpen)
    if (!nextOpen) setEditTruck(null)
  }, [])

  const handleEditTruck = useCallback((truck: Truck) => {
    setEditTruck(truck)
    setDrawerOpen(true)
  }, [])

  const handleTruckSubmit = useCallback(
    async (values: TruckFormValues, truckId?: string) => {
      const basicBody = {
        make: values.make,
        model: values.model,
        year: values.year,
        truckType: values.truckType,
        trailerLengthFt: values.trailerLengthFt ?? 0,
        capacityLbs: values.capacityLbs ?? 0,
        maxPayloadLbs: values.maxPayloadLbs,
        plateNumber: values.plateNumber,
        vin: values.vin,
        certifications: values.certifications,
        isPrimary: values.isPrimary,
        notes: values.notes,
      }

      const expenseBody = {
        fuelCostPerLiter: values.fuelCostPerLiter ?? null,
        fuelEfficiencyKmPerLiter: values.fuelEfficiencyKmPerLiter ?? null,
        insurancePerMonth: values.insurancePerMonth ?? 0,
        maintenancePerKm: values.maintenancePerKm ?? null,
        otherFixedCostsPerMonth: values.otherFixedCostsPerMonth ?? null,
      }

      if (truckId) {
        await updateTruck({ driverId, truckId, body: basicBody })
        await updateTruckExpenses({ driverId, truckId, body: expenseBody })
      } else {
        await createTruck({ driverId, body: basicBody })
      }
      setDrawerOpen(false)
    },
    [driverId, createTruck, updateTruck, updateTruckExpenses]
  )

  // Trailer handlers
  const handleAddTrailer = useCallback(() => {
    setEditTrailer(null)
    setTrailerDrawerOpen(true)
  }, [])

  const handleTrailerDrawerOpenChange = useCallback((nextOpen: boolean) => {
    setTrailerDrawerOpen(nextOpen)
    if (!nextOpen) setEditTrailer(null)
  }, [])

  const handleEditTrailer = useCallback((trailer: Trailer) => {
    setEditTrailer(trailer)
    setTrailerDrawerOpen(true)
  }, [])

  const handleTrailerSubmit = useCallback(
    (values: TrailerFormValues, trailerId?: string) => {
      if (trailerId) {
        updateTrailer({ driverId, trailerId, body: values })
      } else {
        createTrailer({ driverId, body: values })
      }
    },
    [driverId, createTrailer, updateTrailer]
  )

  const handleContactSave = useCallback(
    async (values: ContactFormValues) => {
      await updateDriverProfile({
        driverId,
        body: { phone: values.phone, homeLocation: values.homeLocation },
      })
    },
    [driverId, updateDriverProfile]
  )

  const handlePricingSave = useCallback(
    async (values: PricingFormValues) => {
      await updateDriverProfile({ driverId, body: { pricingPreferences: values } })
    },
    [driverId, updateDriverProfile]
  )

  const handleDriverInfoSubmit = useCallback(
    (values: DriverInfoFormValues) => {
      updateDriverProfileForInfo({
        driverId,
        body: {
          name: values.name,
          professionalTitle: values.professionalTitle,
          profilePictureUrl: values.profilePictureUrl,
          certificationDocuments: values.certificationDocuments,
          mcNumber: values.mcNumber,
          dotNumber: values.dotNumber,
          nscCvorNumber: values.nscCvorNumber,
        },
      })
    },
    [driverId, updateDriverProfileForInfo]
  )

  const handleScoreWeightsSave = useCallback(
    async (weights: ScoreWeights) => {
      await updateDriverProfile({ driverId, body: { scoreWeights: weights } })
    },
    [driverId, updateDriverProfile]
  )

  if (isLoading || !driver) {
    return (
      <PageShell title="My Profile">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
        return <div className="text-sm text-muted-foreground italic">No reviews yet for you.</div>
      }
      return (
        <div className="space-y-3">
          {reviewsPayload.data.map((r) => (
            <ReviewCard key={r._id} review={r} reviewerType="company" />
          ))}
        </div>
      )
    }
    // Skipped or no data yet
    return null
  })()

  return (
    <PageShell
      title="My Profile"
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
                <DriverInfoCard driver={driver} onEdit={() => setDriverInfoDrawerOpen(true)} />
              </Col>
            </Row>
            <Row>
              <Col size={16}>
                <ContactInfoCard driver={driver} onSave={handleContactSave} />
              </Col>
            </Row>
            <Row>
              <Col size={16}>
                <PerformanceCard driver={driver} />
              </Col>
            </Row>
          </Col>

          {/* Column 2 — 75% */}
          <Col size={12}>
            <Row>
              <Col size={16}>
                <TruckInfoCard
                  driver={driver}
                  onAddTruck={handleAddTruck}
                  onEditTruck={handleEditTruck}
                />
              </Col>
            </Row>
            <Row>
              <Col size={16}>
                <TrailerInfoCard
                  trailers={trailers}
                  onAddTrailer={handleAddTrailer}
                  onEditTrailer={handleEditTrailer}
                />
              </Col>
            </Row>
            <Row>
              <Col size={16}>
                <PricingPreferencesCard driver={driver} onSave={handlePricingSave} />
              </Col>
            </Row>
            <Row>
              <Col size={16}>
                <ScoreWeightsCard driver={driver} onEdit={() => setScoreWeightsDrawerOpen(true)} />
              </Col>
            </Row>
            <Row>
              <Col size={16}>
                <NotificationPreferencesCard
                  notificationPreferences={driver.notificationPreferences}
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

      {/* Truck Add/Edit Drawer */}
      <TruckDrawer
        open={drawerOpen}
        onOpenChange={handleTruckDrawerOpenChange}
        editTruck={editTruck}
        onSubmit={handleTruckSubmit}
      />

      {/* Trailer Add/Edit Drawer */}
      <TrailerDrawer
        open={trailerDrawerOpen}
        onOpenChange={handleTrailerDrawerOpenChange}
        editTrailer={editTrailer}
        isLoading={isCreatingTrailer || isUpdatingTrailer}
        onSubmit={handleTrailerSubmit}
      />

      {/* Driver Info Edit Drawer */}
      <DriverInfoDrawer
        open={driverInfoDrawerOpen}
        onOpenChange={setDriverInfoDrawerOpen}
        driver={driver}
        onSubmit={handleDriverInfoSubmit}
      />

      {/* Score Weights Edit Drawer */}
      <ScoreWeightsDrawer
        open={scoreWeightsDrawerOpen}
        onOpenChange={setScoreWeightsDrawerOpen}
        weights={driver.scoreWeights}
        onSave={handleScoreWeightsSave}
      />
    </PageShell>
  )
}
