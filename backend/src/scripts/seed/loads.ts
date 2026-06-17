import { Types } from 'mongoose'
import { LoadModel } from '../../models/loads/Load'
import { LOAD_STATUSES, TRUCK_TYPES } from '../../models/enums'

type TruckTypeValue = (typeof TRUCK_TYPES)[keyof typeof TRUCK_TYPES]
type LoadStatusValue = (typeof LOAD_STATUSES)[keyof typeof LOAD_STATUSES]

/**
 * Truck type mapping — mock data uses some names not in the enum.
 */
function mapTruckType(mockType: string): TruckTypeValue {
  switch (mockType) {
    case 'Dry Van':
      return TRUCK_TYPES.DryVan as TruckTypeValue
    case 'Hopper Bottom':
      return TRUCK_TYPES.Flatbed as TruckTypeValue
    default:
      return mockType as TruckTypeValue
  }
}

/**
 * Status mapping — mock data uses display-friendly names.
 */
function mapStatus(mockStatus: string): LoadStatusValue {
  switch (mockStatus) {
    case 'In Transit':
      return LOAD_STATUSES.InTransit as LoadStatusValue
    case 'Active Bid':
      return LOAD_STATUSES.AuctionLive as LoadStatusValue
    case 'Available':
      return LOAD_STATUSES.AuctionLive as LoadStatusValue
    case 'Completed':
      return LOAD_STATUSES.Completed as LoadStatusValue
    default:
      return LOAD_STATUSES.AuctionLive as LoadStatusValue
  }
}

interface DriverMap {
  [key: string]: Types.ObjectId | undefined | null
}

/**
 * Seed the loads collection with all mock loads distributed across two companies and two drivers.
 */
export async function seedLoads({
  companies,
  drivers,
}: {
  companies: { greenleaf: Types.ObjectId; northern: Types.ObjectId }
  drivers: { sam: Types.ObjectId; alex: Types.ObjectId }
}) {
  await LoadModel.deleteMany({})

  const driverMap: DriverMap = {
    driver1: drivers.sam,
    driver2: drivers.alex,
    driver3: drivers.sam,
  }

  const mockLoads = [
    {
      companyAlias: 'comp001' as const,
      originAddress: 'Vancouver, BC',
      destinationAddress: 'Calgary, AB',
      originCoords: { lat: 49.2827, lng: -123.1207 },
      destinationCoords: { lat: 51.0447, lng: -114.0719 },
      pickupTime: new Date('2026-06-20T08:00:00Z'),
      dropoffTime: new Date('2026-06-22T16:00:00Z'),
      weightLbs: 22000,
      commodity: 'Lumber',
      truckType: 'Flatbed',
      trailerLengthFt: 48,
      certifications: ['Forklift'],
      driverAssist: true,
      status: 'In Transit',
      driverKey: undefined,
    },
    {
      companyAlias: 'comp002' as const,
      originAddress: 'Toronto, ON',
      destinationAddress: 'Montreal, QC',
      originCoords: { lat: 43.6532, lng: -79.3832 },
      destinationCoords: { lat: 45.5017, lng: -73.5673 },
      pickupTime: new Date('2026-06-25T06:00:00Z'),
      dropoffTime: new Date('2026-06-26T14:00:00Z'),
      weightLbs: 15000,
      commodity: 'Auto Parts',
      truckType: 'Dry Van',
      trailerLengthFt: 53,
      certifications: undefined,
      driverAssist: false,
      status: 'Available',
      driverKey: undefined,
    },
    {
      companyAlias: 'comp002' as const,
      originAddress: 'Edmonton, AB',
      destinationAddress: 'Winnipeg, MB',
      originCoords: { lat: 53.5461, lng: -113.4937 },
      destinationCoords: { lat: 49.8951, lng: -97.1384 },
      pickupTime: new Date('2026-07-01T07:00:00Z'),
      dropoffTime: new Date('2026-07-03T18:00:00Z'),
      weightLbs: 38000,
      commodity: 'Grain',
      truckType: 'Hopper Bottom',
      trailerLengthFt: 40,
      certifications: ['Hazmat'],
      driverAssist: false,
      status: 'Available',
      driverKey: undefined,
    },
    {
      companyAlias: 'comp001' as const,
      originAddress: 'Kelowna, BC',
      destinationAddress: 'Kamloops, BC',
      originCoords: { lat: 49.8879, lng: -119.496 },
      destinationCoords: { lat: 50.6745, lng: -120.3273 },
      pickupTime: new Date('2026-06-10T09:00:00Z'),
      dropoffTime: new Date('2026-06-10T15:00:00Z'),
      weightLbs: 8000,
      commodity: 'Fruit',
      truckType: 'Reefer',
      trailerLengthFt: 28,
      certifications: undefined,
      driverAssist: true,
      status: 'Completed',
      driverKey: 'driver1', // Sam
    },
    {
      companyAlias: 'comp002' as const,
      originAddress: 'Prince George, BC',
      destinationAddress: 'Fort McMurray, AB',
      originCoords: { lat: 53.9171, lng: -122.7497 },
      destinationCoords: { lat: 56.7264, lng: -111.3803 },
      pickupTime: new Date('2026-07-05T06:00:00Z'),
      dropoffTime: new Date('2026-07-06T20:00:00Z'),
      weightLbs: 44000,
      commodity: 'Industrial Equipment',
      truckType: 'Flatbed',
      trailerLengthFt: 48,
      certifications: ['Hazmat', 'Forklift'],
      driverAssist: true,
      status: 'Active Bid',
      driverKey: undefined,
    },
    {
      companyAlias: 'comp002' as const,
      originAddress: 'Halifax, NS',
      destinationAddress: 'Saint John, NB',
      originCoords: { lat: 44.6488, lng: -63.5752 },
      destinationCoords: { lat: 45.2738, lng: -66.0633 },
      pickupTime: new Date('2026-07-08T07:00:00Z'),
      dropoffTime: new Date('2026-07-08T18:00:00Z'),
      weightLbs: 12000,
      commodity: 'Seafood',
      truckType: 'Reefer',
      trailerLengthFt: 28,
      certifications: undefined,
      driverAssist: false,
      status: 'Available',
      driverKey: undefined,
    },
    {
      companyAlias: 'comp002' as const,
      originAddress: 'Calgary, AB',
      destinationAddress: 'Saskatoon, SK',
      originCoords: { lat: 51.0447, lng: -114.0719 },
      destinationCoords: { lat: 52.1579, lng: -106.6702 },
      pickupTime: new Date('2026-06-28T05:00:00Z'),
      dropoffTime: new Date('2026-06-29T12:00:00Z'),
      weightLbs: 26000,
      commodity: 'Steel Pipes',
      truckType: 'Flatbed',
      trailerLengthFt: 48,
      certifications: undefined,
      driverAssist: true,
      status: 'In Transit',
      driverKey: 'driver2', // Alex
    },
    {
      companyAlias: 'comp002' as const,
      originAddress: 'Windsor, ON',
      destinationAddress: 'London, ON',
      originCoords: { lat: 42.3149, lng: -83.0364 },
      destinationCoords: { lat: 42.9849, lng: -81.2453 },
      pickupTime: new Date('2026-07-12T09:00:00Z'),
      dropoffTime: new Date('2026-07-12T14:00:00Z'),
      weightLbs: 5000,
      commodity: 'Pharmaceuticals',
      truckType: 'Dry Van',
      trailerLengthFt: 28,
      certifications: ['Hazmat'],
      driverAssist: false,
      status: 'Available',
      driverKey: undefined,
    },
    {
      companyAlias: 'comp002' as const,
      originAddress: 'Regina, SK',
      destinationAddress: 'Thunder Bay, ON',
      originCoords: { lat: 50.4452, lng: -104.6189 },
      destinationCoords: { lat: 48.3809, lng: -89.2477 },
      pickupTime: new Date('2026-07-15T06:00:00Z'),
      dropoffTime: new Date('2026-07-17T20:00:00Z'),
      weightLbs: 42000,
      commodity: 'Potash',
      truckType: 'Hopper Bottom',
      trailerLengthFt: 40,
      certifications: ['Hazmat'],
      driverAssist: false,
      status: 'In Transit',
      driverKey: 'driver3', // Sam
    },
    {
      companyAlias: 'comp001' as const,
      originAddress: 'Surrey, BC',
      destinationAddress: 'Nanaimo, BC',
      originCoords: { lat: 49.1044, lng: -122.8011 },
      destinationCoords: { lat: 49.1659, lng: -123.9401 },
      pickupTime: new Date('2026-07-18T08:00:00Z'),
      dropoffTime: new Date('2026-07-18T16:00:00Z'),
      weightLbs: 18000,
      commodity: 'Building Materials',
      truckType: 'Flatbed',
      trailerLengthFt: 48,
      certifications: ['Forklift'],
      driverAssist: true,
      status: 'Available',
      driverKey: undefined,
    },
    {
      companyAlias: 'comp002' as const,
      originAddress: 'Quebec City, QC',
      destinationAddress: 'Ottawa, ON',
      originCoords: { lat: 46.8139, lng: -71.208 },
      destinationCoords: { lat: 45.4215, lng: -75.6972 },
      pickupTime: new Date('2026-07-20T07:00:00Z'),
      dropoffTime: new Date('2026-07-21T12:00:00Z'),
      weightLbs: 10000,
      commodity: 'Electronics',
      truckType: 'Dry Van',
      trailerLengthFt: 53,
      certifications: undefined,
      driverAssist: false,
      status: 'Active Bid',
      driverKey: undefined,
    },
  ]

  const companyMap: Record<string, Types.ObjectId> = {
    comp001: companies.greenleaf,
    comp002: companies.northern,
  }

  const loads = await Promise.all(
    mockLoads.map((m) => {
      const driverId = m.driverKey ? driverMap[m.driverKey] ?? null : null
      const companyId = companyMap[m.companyAlias]

      return LoadModel.create({
        companyId,
        createdBy: companyId,
        assignedDriverId: driverId,
        originAddress: m.originAddress,
        destinationAddress: m.destinationAddress,
        originCoords: m.originCoords,
        destinationCoords: m.destinationCoords,
        pickupTime: m.pickupTime,
        dropoffTime: m.dropoffTime,
        weightLbs: m.weightLbs,
        commodity: m.commodity,
        truckType: mapTruckType(m.truckType),
        trailerLengthFt: m.trailerLengthFt,
        certifications: m.certifications || [],
        driverAssist: m.driverAssist,
        status: mapStatus(m.status),
      })
    })
  )

  return loads
}