import { Types } from 'mongoose'
import type { Trailer } from '../../models/trucks/Trailer'
import { TrailerModel } from '../../models/trucks/Trailer'
import { DriverModel } from '../../models/users/Driver'
import { TRUCK_TYPES, CERTIFICATIONS } from '../../models/enums'
import type { SeedDriverKey } from './users'

// Fixed ObjectIds for seeded trailers (range: ...0410 – ...0417)
const TRAILER_IDS: Record<string, Types.ObjectId> = {
  testUser1_1: new Types.ObjectId('000000000000000000000410'),
  testUser1_2: new Types.ObjectId('000000000000000000000411'),
  testUser2_1: new Types.ObjectId('000000000000000000000412'),
  testUser3_1: new Types.ObjectId('000000000000000000000413'),
  testUser3_2: new Types.ObjectId('000000000000000000000414'),
  testUser4_1: new Types.ObjectId('000000000000000000000415'),
  testUser4_2: new Types.ObjectId('000000000000000000000416'),
  testUser5_1: new Types.ObjectId('000000000000000000000417'),
}

type DriverDoc = Awaited<ReturnType<typeof import('./users').seedUsers>>['drivers'][SeedDriverKey]

/** Seed trailers for each driver, matching their primary truck types. */
export async function seedTrailers(drivers: Record<SeedDriverKey, DriverDoc>) {
  await TrailerModel.deleteMany({})

  const trailerData = [
    // testUser1 — DryVan 53ft (primary) + Reefer 48ft
    {
      _id: TRAILER_IDS.testUser1_1,
      ownerDriverId: drivers.testUser1._id,
      unitNumber: 'TR-101',
      plateNumber: 'AB-TR101',
      vin: '5V8VC953XLM410001',
      trailerType: TRUCK_TYPES.DryVan,
      lengthFt: 53,
      capacityLbs: 44000,
      year: 2022,
      make: 'Wabash',
      certifications: [],
      isPrimary: true,
      notes: '53ft dry van for general freight',
    },
    {
      _id: TRAILER_IDS.testUser1_2,
      ownerDriverId: drivers.testUser1._id,
      unitNumber: 'TR-102',
      plateNumber: 'AB-TR102',
      vin: '5V8VC953XLM410002',
      trailerType: TRUCK_TYPES.Reefer,
      lengthFt: 48,
      capacityLbs: 43000,
      year: 2023,
      make: 'Utility',
      certifications: [CERTIFICATIONS.ReeferHACCP],
      isPrimary: false,
      notes: '48ft reefer for temperature-sensitive loads',
    },
    // testUser2 — Flatbed 48ft (primary)
    {
      _id: TRAILER_IDS.testUser2_1,
      ownerDriverId: drivers.testUser2._id,
      unitNumber: 'TR-201',
      plateNumber: 'BC-TR201',
      vin: '5V8VC953XLM410003',
      trailerType: TRUCK_TYPES.Flatbed,
      lengthFt: 48,
      capacityLbs: 46000,
      year: 2021,
      make: 'Manac',
      certifications: [CERTIFICATIONS.Hazmat],
      isPrimary: true,
      notes: '48ft flatbed with removable sides',
    },
    // testUser3 — DryVan 53ft (primary) ×2
    {
      _id: TRAILER_IDS.testUser3_1,
      ownerDriverId: drivers.testUser3._id,
      unitNumber: 'TR-301',
      plateNumber: 'SK-TR301',
      vin: '5V8VC953XLM410004',
      trailerType: TRUCK_TYPES.DryVan,
      lengthFt: 53,
      capacityLbs: 44500,
      year: 2020,
      make: 'Great Dane',
      certifications: [],
      isPrimary: true,
      notes: 'Primary dry van for prairie routes',
    },
    {
      _id: TRAILER_IDS.testUser3_2,
      ownerDriverId: drivers.testUser3._id,
      unitNumber: 'TR-302',
      plateNumber: 'SK-TR302',
      vin: '5V8VC953XLM410005',
      trailerType: TRUCK_TYPES.DryVan,
      lengthFt: 53,
      capacityLbs: 44000,
      year: 2024,
      make: 'Great Dane',
      certifications: [],
      isPrimary: false,
      notes: 'Secondary dry van for regional runs',
    },
    // testUser4 — Reefer 53ft (primary) + Flatbed 40ft
    {
      _id: TRAILER_IDS.testUser4_1,
      ownerDriverId: drivers.testUser4._id,
      unitNumber: 'TR-401',
      plateNumber: 'ON-TR401',
      vin: '5V8VC953XLM410006',
      trailerType: TRUCK_TYPES.Reefer,
      lengthFt: 53,
      capacityLbs: 45500,
      year: 2023,
      make: 'Carrier Transicold',
      certifications: [CERTIFICATIONS.ReeferHACCP, CERTIFICATIONS.Hazmat],
      isPrimary: true,
      notes: '53ft reefer for cross-border perishables',
    },
    {
      _id: TRAILER_IDS.testUser4_2,
      ownerDriverId: drivers.testUser4._id,
      unitNumber: 'TR-402',
      plateNumber: 'ON-TR402',
      vin: '5V8VC953XLM410007',
      trailerType: TRUCK_TYPES.Flatbed,
      lengthFt: 40,
      capacityLbs: 47000,
      year: 2022,
      make: 'Manac',
      certifications: [],
      isPrimary: false,
      notes: 'Short flatbed for Ontario construction freight',
    },
    // testUser5 — StepDeck 48ft (primary)
    {
      _id: TRAILER_IDS.testUser5_1,
      ownerDriverId: drivers.testUser5._id,
      unitNumber: 'TR-501',
      plateNumber: 'MB-TR501',
      vin: '5V8VC953XLM410008',
      trailerType: TRUCK_TYPES.StepDeck,
      lengthFt: 48,
      capacityLbs: 48000,
      year: 2024,
      make: 'Talbert',
      certifications: [],
      isPrimary: true,
      notes: '48ft step deck for oversized specialized loads',
    },
  ]

  const trailers = await TrailerModel.insertMany(
    trailerData.map((t) => ({
      _id: t._id,
      ownerDriverId: t.ownerDriverId,
      unitNumber: t.unitNumber,
      plateNumber: t.plateNumber,
      vin: t.vin,
      trailerType: t.trailerType,
      lengthFt: t.lengthFt,
      capacityLbs: t.capacityLbs,
      year: t.year,
      make: t.make,
      certifications: t.certifications,
      isPrimary: t.isPrimary,
      notes: t.notes,
    }))
  )

  // Sync each driver's trailers array
  for (const driverKey of Object.keys(drivers) as SeedDriverKey[]) {
    const driverTrailers = trailers.filter(
      (t) => t.ownerDriverId.toString() === drivers[driverKey]._id.toString()
    )
    if (driverTrailers.length > 0) {
      await DriverModel.findByIdAndUpdate(drivers[driverKey]._id, {
        $set: { trailers: driverTrailers.map((t) => t._id) },
      })
    }
  }

  return trailers
}