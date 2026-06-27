import { Types } from 'mongoose'
import { TruckModel } from '../../models/trucks/Truck'
import { DriverModel } from '../../models/users/Driver'
import { TRUCK_TYPES, CERTIFICATIONS, type TruckType, type Certification } from '../../models/enums'
import type { SeedDriverKey } from './users'

// Fixed ObjectIds for seeded trucks (range: ...0401 – ...0407)
const TRUCK_IDS: Record<string, Types.ObjectId> = {
  testUser1_1: new Types.ObjectId('000000000000000000000401'),
  testUser1_2: new Types.ObjectId('000000000000000000000402'),
  testUser2_1: new Types.ObjectId('000000000000000000000403'),
  testUser3_1: new Types.ObjectId('000000000000000000000404'),
  testUser4_1: new Types.ObjectId('000000000000000000000405'),
  testUser4_2: new Types.ObjectId('000000000000000000000406'),
  testUser5_1: new Types.ObjectId('000000000000000000000407'),
}

type DriverDoc = Awaited<ReturnType<typeof import('./users').seedUsers>>['drivers'][SeedDriverKey]

/** Seed trucks for each driver with realistic Canadian fleet specs. */
export async function seedTrucks(
  drivers: Record<SeedDriverKey, DriverDoc>
) {
  await TruckModel.deleteMany({})

  const truckData: Array<{
    id: Types.ObjectId
    ownerDriverId: Types.ObjectId
    make: string
    model: string
    year: number
    truckType: TruckType
    trailerLengthFt: number
    capacityLbs: number
    maxPayloadLbs: number
    plateNumber: string
    vin: string
    certifications: Certification[]
    isPrimary: boolean
  }> = [
    {
      id: TRUCK_IDS.testUser1_1,
      ownerDriverId: drivers.testUser1._id,
      make: 'Freightliner',
      model: 'Cascadia 126',
      year: 2022,
      truckType: TRUCK_TYPES.DryVan,
      trailerLengthFt: 53,
      capacityLbs: 45000,
      maxPayloadLbs: 42000,
      plateNumber: 'AB-12345',
      vin: '1FUJGLD52NL123456',
      certifications: [],
      isPrimary: true,
    },
    {
      id: TRUCK_IDS.testUser1_2,
      ownerDriverId: drivers.testUser1._id,
      make: 'Volvo',
      model: 'VNL 860',
      year: 2023,
      truckType: TRUCK_TYPES.Reefer,
      trailerLengthFt: 48,
      capacityLbs: 44000,
      maxPayloadLbs: 41000,
      plateNumber: 'AB-67890',
      vin: '4V4NC9EH4RN345678',
      certifications: [CERTIFICATIONS.ReeferHACCP],
      isPrimary: false,
    },
    {
      id: TRUCK_IDS.testUser2_1,
      ownerDriverId: drivers.testUser2._id,
      make: 'Kenworth',
      model: 'T680',
      year: 2021,
      truckType: TRUCK_TYPES.Flatbed,
      trailerLengthFt: 48,
      capacityLbs: 46000,
      maxPayloadLbs: 43000,
      plateNumber: 'BC-98765',
      vin: '1XKYD49X9MJ654321',
      certifications: [CERTIFICATIONS.Hazmat],
      isPrimary: true,
    },
    {
      id: TRUCK_IDS.testUser3_1,
      ownerDriverId: drivers.testUser3._id,
      make: 'Peterbilt',
      model: '579',
      year: 2020,
      truckType: TRUCK_TYPES.DryVan,
      trailerLengthFt: 53,
      capacityLbs: 44500,
      maxPayloadLbs: 41500,
      plateNumber: 'SK-54321',
      vin: '1XPBDP9X8LJ987654',
      certifications: [],
      isPrimary: true,
    },
    {
      id: TRUCK_IDS.testUser4_1,
      ownerDriverId: drivers.testUser4._id,
      make: 'Mack',
      model: 'Anthem',
      year: 2023,
      truckType: TRUCK_TYPES.Reefer,
      trailerLengthFt: 53,
      capacityLbs: 45500,
      maxPayloadLbs: 42500,
      plateNumber: 'ON-HYBRID',
      vin: '1M2AG09C3NM112233',
      certifications: [CERTIFICATIONS.ReeferHACCP, CERTIFICATIONS.Hazmat],
      isPrimary: true,
    },
    {
      id: TRUCK_IDS.testUser4_2,
      ownerDriverId: drivers.testUser4._id,
      make: 'International',
      model: 'LT Series',
      year: 2022,
      truckType: TRUCK_TYPES.Flatbed,
      trailerLengthFt: 40,
      capacityLbs: 47000,
      maxPayloadLbs: 44000,
      plateNumber: 'ON-554433',
      vin: '3HSDZTBR1NN445566',
      certifications: [],
      isPrimary: false,
    },
    {
      id: TRUCK_IDS.testUser5_1,
      ownerDriverId: drivers.testUser5._id,
      make: 'Western Star',
      model: '47X',
      year: 2024,
      truckType: TRUCK_TYPES.StepDeck,
      trailerLengthFt: 48,
      capacityLbs: 48000,
      maxPayloadLbs: 45000,
      plateNumber: 'MB-X7000',
      vin: '2WJDT3CV9RK778899',
      certifications: [],
      isPrimary: true,
    },
  ]

  const trucks = await TruckModel.insertMany(
    truckData.map((t) => ({
      _id: t.id,
      ownerDriverId: t.ownerDriverId,
      make: t.make,
      model: t.model,
      year: t.year,
      truckType: t.truckType,
      trailerLengthFt: t.trailerLengthFt,
      capacityLbs: t.capacityLbs,
      maxPayloadLbs: t.maxPayloadLbs,
      plateNumber: t.plateNumber,
      vin: t.vin,
      certifications: t.certifications,
      isPrimary: t.isPrimary,
    }))
  )

  // Sync each driver's trucks array
  for (const driverKey of Object.keys(drivers) as SeedDriverKey[]) {
    const driverTrucks = trucks.filter(
      (t) => t.ownerDriverId.toString() === drivers[driverKey]._id.toString()
    )
    if (driverTrucks.length > 0) {
      await DriverModel.findByIdAndUpdate(drivers[driverKey]._id, {
        $set: { trucks: driverTrucks.map((t) => t._id) },
      })
    }
  }

  return trucks
}