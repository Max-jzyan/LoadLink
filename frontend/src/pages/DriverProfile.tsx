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
import { useRequiredMongoId } from '@/hooks/useAuth'
import type { Truck } from '@/services/driverApi/driverEnum'
import {
  useCreateTruckMutation,
  useGetDriverProfileQuery,
  useUpdateDriverProfileMutation,
  useUpdateTruckMutation,
  useUpdateTruckExpensesMutation,
} from '@/services/driverApi/driverSlice'
import { Loader2 } from 'lucide-react'
import { useCallback, useState } from 'react'

export default function DriverProfile() {
  const driverId = useRequiredMongoId()
  const {
    data: driver,
    isLoading,
    isError,
  } = useGetDriverProfileQuery(driverId)

  const [updateDriverProfile] = useUpdateDriverProfileMutation()
  const [createTruck] = useCreateTruckMutation()
  const [updateTruck] = useUpdateTruckMutation()
  const [updateTruckExpenses] = useUpdateTruckExpensesMutation()

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
      // Basic truck properties (RTK mutation expects required trailerLengthFt/capacityLbs)
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

      // Expense preferences - extract from form values
      const expenseBody = {
        fuelCostPerLiter: values.fuelCostPerLiter ?? null,
        fuelEfficiencyKmPerLiter: values.fuelEfficiencyKmPerLiter ?? null,
        insurancePerMonth: values.insurancePerMonth ?? 0,
        maintenancePerKm: values.maintenancePerKm ?? null,
        otherFixedCostsPerMonth: values.otherFixedCostsPerMonth ?? null,
      }

      if (truckId) {
        // Update existing truck - separate API calls for basic info and expenses
        await updateTruck({ driverId, truckId, body: basicBody }).unwrap()
        // Update expenses (separate endpoint)
        await updateTruckExpenses({ driverId, truckId, body: expenseBody }).unwrap()
      } else {
        // Create new truck with basic properties first
        await createTruck({ driverId, body: basicBody }).unwrap()
      }
      setDrawerOpen(false)
    },
    [driverId, createTruck, updateTruck, updateTruckExpenses]
  )

  const handleContactSave = useCallback(
    async (values: ContactFormValues) => {
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
      await updateDriverProfile({
        driverId,
        body: {
          name: values.name,
          professionalTitle: values.professionalTitle,
          profilePictureUrl: values.profilePictureUrl,
          certificationDocuments: values.certificationDocuments,
        },
      }).unwrap()
      setDriverInfoDrawerOpen(false)
    },
    [driverId, updateDriverProfile]
  )

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