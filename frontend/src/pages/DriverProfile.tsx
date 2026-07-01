import type { ContactFormValues } from '@/components/driverProfile/ContactInfoCard'
import ContactInfoCard from '@/components/driverProfile/ContactInfoCard'
import DriverInfoCard from '@/components/driverProfile/DriverInfoCard'
import type { DriverInfoFormValues } from '@/components/driverProfile/DriverInfoDrawer'
import DriverInfoDrawer from '@/components/driverProfile/DriverInfoDrawer'
import NotificationPreferencesCard from '@/components/driverProfile/NotificationPreferencesCard'
import PerformanceCard from '@/components/driverProfile/PerformanceCard'
import type { PricingFormValues } from '@/components/driverProfile/PricingPreferencesCard'
import PricingPreferencesCard from '@/components/driverProfile/PricingPreferencesCard'
import type { TruckFormValues } from '@/components/driverProfile/TruckDrawer'
import TruckDrawer from '@/components/driverProfile/TruckDrawer'
import TruckInfoCard from '@/components/driverProfile/TruckInfoCard'
import Col from '@/components/layout/Col'
import PageShell from '@/components/layout/PageShell'
import Row from '@/components/layout/Row'
import { selectMongoId } from '@/services/authSlice'
import type { Truck } from '@/services/driverApi/driverEnum'
import {
  useCreateTruckMutation,
  useGetDriverProfileQuery,
  useUpdateDriverProfileMutation,
  useUpdateTruckMutation,
} from '@/services/driverApi/driverSlice'
import { Loader2 } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useSelector } from 'react-redux'

export default function DriverProfile() {
  const driverId = useSelector(selectMongoId)
  const { data: driver, isLoading, isError } = useGetDriverProfileQuery(driverId!, {
    skip: !driverId,
  })

  const [updateDriverProfile] = useUpdateDriverProfileMutation()
  const [createTruck] = useCreateTruckMutation()
  const [updateTruck] = useUpdateTruckMutation()

  // Truck drawer state
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editTruck, setEditTruck] = useState<Truck | null>(null)

  // Driver info drawer state
  const [driverInfoDrawerOpen, setDriverInfoDrawerOpen] = useState(false)

  const handleAddTruck = useCallback(() => {
    setEditTruck(null)
    setDrawerOpen(true)
  }, [])

  const handleTruckDrawerOpenChange = useCallback((nextOpen: boolean) => {
    setDrawerOpen(nextOpen)

    // Explicitly reset all drawer state when closing, so reopening for "Add New Truck"
    // can never display stale Truck123 values.
    if (!nextOpen) {
      setEditTruck(null)
    }
  }, [])


  const handleEditTruck = useCallback((truck: Truck) => {
    setEditTruck(truck)
    setDrawerOpen(true)
  }, [])

  const handleTruckSubmit = useCallback(
    async (values: TruckFormValues, truckId?: string) => {
      if (!driverId) return

      // RTK mutation expects CreateTruckPayload where trailerLengthFt is required (number).
      // TruckFormValues may provide undefined, so coerce to a safe default.
      const body = {
        ...values,
        trailerLengthFt: values.trailerLengthFt ?? 0,
        capacityLbs: values.capacityLbs ?? 0,
      }


      if (truckId) {
        await updateTruck({ driverId, truckId, body }).unwrap()
      } else {
        await createTruck({ driverId, body }).unwrap()
      }
      setDrawerOpen(false)
    },
    [driverId, createTruck, updateTruck]
  )


  const handleContactSave = useCallback(
    async (values: ContactFormValues) => {
      if (!driverId) return
      await updateDriverProfile({
        driverId,
        body: {
          phone: values.phone,
          homeLocation: values.homeLocation,
        },
      }).unwrap()
    },
    [driverId, updateDriverProfile]
  )

  const handlePricingSave = useCallback(
    async (values: PricingFormValues) => {
      if (!driverId) return
      await updateDriverProfile({
        driverId,
        body: {
          pricingPreferences: values,
        },
      }).unwrap()
    },
    [driverId, updateDriverProfile]
  )

  const handleDriverInfoSubmit = useCallback(
    async (values: DriverInfoFormValues) => {
      if (!driverId) return
      await updateDriverProfile({
        driverId,
        body: {
          name: values.name,
          professionalTitle: values.professionalTitle,
          profilePictureUrl: values.profilePictureUrl,
        },
      }).unwrap()
      setDriverInfoDrawerOpen(false)
    },
    [driverId, updateDriverProfile]
  )

  if (!driverId) {
    return (
      <PageShell title="My Profile">
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          Please log in to view your profile.
        </div>
      </PageShell>
    )
  }

  if (isLoading) {
    return (
      <PageShell title="My Profile">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PageShell>
    )
  }

  if (isError || !driver) {
    return (
      <PageShell title="My Profile">
        <div className="flex items-center justify-center py-20 text-destructive">
          Failed to load profile. Please try again later.
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell title="My Profile">
      <Row>
        {/* Column 1 — 25% width (4/16) */}
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

        {/* Column 2 — 75% width (12/16) */}
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
              <PricingPreferencesCard driver={driver} onSave={handlePricingSave} />
            </Col>
          </Row>
          <Row>
            <Col size={16}>
              <NotificationPreferencesCard driver={driver} />
            </Col>
          </Row>
        </Col>
      </Row>

      {/* Truck Add/Edit Drawer */}
      <TruckDrawer
        open={drawerOpen}
        onOpenChange={handleTruckDrawerOpenChange}
        editTruck={editTruck}
        onSubmit={handleTruckSubmit}
      />

      {/* Driver Info Edit Drawer */}
      <DriverInfoDrawer
        open={driverInfoDrawerOpen}
        onOpenChange={setDriverInfoDrawerOpen}
        driver={driver}
        onSubmit={handleDriverInfoSubmit}
      />
    </PageShell>
  )
}