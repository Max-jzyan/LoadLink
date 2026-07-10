import { Types } from 'mongoose'
import { LoadModel } from '../../models/loads/Load'
import { LOAD_STATUSES, TRUCK_TYPES, CERTIFICATIONS } from '../../models/enums'

const LOAD_IDS = [
  new Types.ObjectId('000000000000000000000101'),
  new Types.ObjectId('000000000000000000000102'),
  new Types.ObjectId('000000000000000000000103'),
  new Types.ObjectId('000000000000000000000104'),
  new Types.ObjectId('000000000000000000000105'),
  new Types.ObjectId('000000000000000000000106'),
  new Types.ObjectId('000000000000000000000107'),
  new Types.ObjectId('000000000000000000000108'),
]

/** Seed active auction loads for each test company, plus one near-to-close-with-no-winner load. */
export async function seedLoads({
  companies,
}: {
  companies: { testCompany1: Types.ObjectId; testCompany2: Types.ObjectId }
}) {
  await LoadModel.deleteMany({})

  const mockLoads = [
    {
      companyId: companies.testCompany2,
      originAddress: 'Edmonton, AB',
      destinationAddress: 'Winnipeg, MB',
      originCoords: { lat: 53.5461, lng: -113.4938 },
      destinationCoords: { lat: 49.8951, lng: -97.1384 },
      pickupTime: new Date('2026-07-13T06:00:00Z'),
      dropoffTime: new Date('2026-07-15T14:00:00Z'),
      weightLbs: 25000,
      commodity: 'Lumber',
      truckType: TRUCK_TYPES.DryVan,
      trailerLengthFt: 48,
      certifications: [],
      driverAssist: false,
    },
    {
      companyId: companies.testCompany1,
      originAddress: 'Surrey, BC',
      destinationAddress: 'Victoria, BC',
      originCoords: { lat: 49.1044, lng: -122.8011 },
      destinationCoords: { lat: 48.4284, lng: -123.3656 },
      pickupTime: new Date('2026-07-12T17:00:00Z'),
      dropoffTime: new Date('2026-07-12T23:00:00Z'),
      weightLbs: 7500,
      commodity: 'Electronics',
      truckType: TRUCK_TYPES.DryVan,
      trailerLengthFt: 28,
      certifications: [],
      driverAssist: false,
    },
    {
      companyId: companies.testCompany2,
      originAddress: 'Toronto, ON',
      destinationAddress: 'Montreal, QC',
      originCoords: { lat: 43.6532, lng: -79.3832 },
      destinationCoords: { lat: 45.5017, lng: -73.5673 },
      pickupTime: new Date('2026-07-14T13:00:00Z'),
      dropoffTime: new Date('2026-07-15T20:00:00Z'),
      weightLbs: 15000,
      commodity: 'Auto Parts',
      truckType: TRUCK_TYPES.DryVan,
      trailerLengthFt: 53,
      certifications: [],
      driverAssist: false,
    },
    {
      companyId: companies.testCompany2,
      originAddress: 'Edmonton, AB',
      destinationAddress: 'Winnipeg, MB',
      originCoords: { lat: 53.5461, lng: -113.4937 },
      destinationCoords: { lat: 49.8951, lng: -97.1384 },
      pickupTime: new Date('2026-07-18T14:00:00Z'),
      dropoffTime: new Date('2026-07-20T01:00:00Z'),
      weightLbs: 38000,
      commodity: 'Grain',
      truckType: TRUCK_TYPES.Flatbed,
      trailerLengthFt: 40,
      certifications: [CERTIFICATIONS.Hazmat],
      driverAssist: false,
    },
    {
      companyId: companies.testCompany1,
      originAddress: 'Calgary, AB',
      destinationAddress: 'Saskatoon, SK',
      originCoords: { lat: 51.0447, lng: -114.0719 },
      destinationCoords: { lat: 52.1332, lng: -106.67 },
      pickupTime: new Date('2026-07-09T15:00:00Z'),
      dropoffTime: new Date('2026-07-09T22:00:00Z'),
      weightLbs: 12000,
      commodity: 'Packaged Goods',
      truckType: TRUCK_TYPES.DryVan,
      trailerLengthFt: 53,
      certifications: [],
      driverAssist: false,
    },
    {
      companyId: companies.testCompany1,
      originAddress: 'Vancouver, BC',
      destinationAddress: 'Edmonton, AB',
      originCoords: { lat: 49.2827, lng: -123.1207 },
      destinationCoords: { lat: 53.5461, lng: -113.4938 },
      pickupTime: new Date('2026-07-10T08:00:00Z'),
      dropoffTime: new Date('2026-07-12T18:00:00Z'),
      weightLbs: 18000,
      commodity: 'Furniture',
      truckType: TRUCK_TYPES.DryVan,
      trailerLengthFt: 48,
      certifications: [],
      driverAssist: true,
    },
    {
      companyId: companies.testCompany2,
      originAddress: 'Edmonton, AB',
      destinationAddress: 'Winnipeg, MB',
      originCoords: { lat: 53.5461, lng: -113.4938 },
      destinationCoords: { lat: 49.8951, lng: -97.1384 },
      pickupTime: new Date('2026-07-13T06:00:00Z'),
      dropoffTime: new Date('2026-07-15T14:00:00Z'),
      weightLbs: 25000,
      commodity: 'Lumber',
      truckType: TRUCK_TYPES.DryVan,
      trailerLengthFt: 48,
      certifications: [],
      driverAssist: false,
    },
    {
      companyId: companies.testCompany1,
      originAddress: 'Toronto, ON',
      destinationAddress: 'Montreal, QC',
      originCoords: { lat: 43.6532, lng: -79.3832 },
      destinationCoords: { lat: 45.5017, lng: -73.5673 },
      pickupTime: new Date('2026-07-12T10:00:00Z'),
      dropoffTime: new Date('2026-07-14T16:00:00Z'),
      weightLbs: 20000,
      commodity: 'Consumer Goods',
      truckType: TRUCK_TYPES.DryVan,
      trailerLengthFt: 53,
      certifications: [],
      driverAssist: false,
    },
  ]

  const loads = await Promise.all(
    mockLoads.map((load, index) =>
      LoadModel.create({
        _id: LOAD_IDS[index],
        companyId: load.companyId,
        createdBy: load.companyId,
        originAddress: load.originAddress,
        destinationAddress: load.destinationAddress,
        originCoords: load.originCoords,
        destinationCoords: load.destinationCoords,
        pickupTime: load.pickupTime,
        dropoffTime: load.dropoffTime,
        weightLbs: load.weightLbs,
        commodity: load.commodity,
        truckType: load.truckType,
        trailerLengthFt: load.trailerLengthFt,
        certifications: load.certifications,
        driverAssist: load.driverAssist,
        status: LOAD_STATUSES.AuctionLive,
      })
    )
  )

  return loads
}
