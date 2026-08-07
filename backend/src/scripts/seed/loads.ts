import { Types } from 'mongoose'
import { LoadModel } from '../../models/loads/Load'
import { LOAD_STATUSES, TRUCK_TYPES, CERTIFICATIONS } from '../../models/enums'
import type { SeedDriverKey, SeedCompanyKey } from './users'

// Active (auction_live) load ObjectIds — one auction will be created per load.
const ACTIVE_LOAD_IDS = [
  new Types.ObjectId('000000000000000000000101'),
  new Types.ObjectId('000000000000000000000102'),
  new Types.ObjectId('000000000000000000000103'),
  new Types.ObjectId('000000000000000000000104'),
  new Types.ObjectId('000000000000000000000105'),
  new Types.ObjectId('000000000000000000000106'),
  new Types.ObjectId('000000000000000000000107'),
  new Types.ObjectId('000000000000000000000108'),
  new Types.ObjectId('000000000000000000000109'),
  new Types.ObjectId('000000000000000000000110'),
  new Types.ObjectId('000000000000000000000111'),
  new Types.ObjectId('000000000000000000000112'),
  new Types.ObjectId('000000000000000000000113'),
  new Types.ObjectId('000000000000000000000114'),
  // Extra active loads so the board feels busy (now using company3/company4)
  new Types.ObjectId('000000000000000000000115'),
  new Types.ObjectId('000000000000000000000116'),
  new Types.ObjectId('000000000000000000000117'),
  new Types.ObjectId('000000000000000000000118'),
  // Demo load: hand-tuned to score very high (~83/100) for testUser1 in the
  // driver recommendation engine — origin matches testUser1's current known
  // location (Vancouver, destination of completed load 119) for zero deadhead,
  // Reefer truck type + ReeferHACCP cert matches testUser1's second truck,
  // and price is set well above testUser1's rate/value minimums. No bids
  // seeded so it stays fresh for a live "place a bid" demo moment.
  new Types.ObjectId('000000000000000000000127'),
]

// Historical completed load ObjectIds — these simulate prior hauls.
export const COMPLETED_LOAD_IDS: Record<string, Types.ObjectId> = {
  '000000000000000000000119': new Types.ObjectId('000000000000000000000119'),
  '000000000000000000000120': new Types.ObjectId('000000000000000000000120'),
  '000000000000000000000121': new Types.ObjectId('000000000000000000000121'),
  '000000000000000000000122': new Types.ObjectId('000000000000000000000122'),
  '000000000000000000000123': new Types.ObjectId('000000000000000000000123'),
  '000000000000000000000124': new Types.ObjectId('000000000000000000000124'),
  '000000000000000000000125': new Types.ObjectId('000000000000000000000125'),
  '000000000000000000000126': new Types.ObjectId('000000000000000000000126'),
}

type DriverMap = Record<SeedDriverKey, { _id: Types.ObjectId }>
type CompanyMap = Record<SeedCompanyKey, { _id: Types.ObjectId }>

/** Seed active auction loads plus historical completed loads. */
export async function seedLoads({
  companies,
  drivers,
}: {
  companies: CompanyMap
  drivers: DriverMap
}) {
  await LoadModel.deleteMany({})

  const today = new Date()
  const todayMidnight = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  )
  const addDays = (days: number, hours = 0, minutes = 0) => {
    const d = new Date(todayMidnight)
    d.setUTCDate(d.getUTCDate() + days)
    d.setUTCHours(hours)
    d.setUTCMinutes(minutes)
    return d
  }
  const pastDays = (daysAgo: number, hours = 0, minutes = 0) => {
    const d = new Date(todayMidnight)
    d.setUTCDate(d.getUTCDate() - daysAgo)
    d.setUTCHours(hours)
    d.setUTCMinutes(minutes)
    return d
  }

  const activeLoads = [
    // Load 101
    {
      companyId: companies.testCompany2._id,
      originAddress: 'Edmonton, AB',
      destinationAddress: 'Winnipeg, MB',
      originCoords: { lat: 53.5461, lng: -113.4938 },
      destinationCoords: { lat: 49.8951, lng: -97.1384 },
      pickupTime: addDays(1, 6, 0),
      dropoffTime: addDays(3, 14, 0),
      weightLbs: 25000,
      commodity: 'Lumber',
      truckType: TRUCK_TYPES.DryVan,
      trailerLengthFt: 48,
      certifications: [],
      driverAssist: false,
    },
    // Load 102
    {
      companyId: companies.testCompany1._id,
      originAddress: 'Surrey, BC',
      destinationAddress: 'Victoria, BC',
      originCoords: { lat: 49.1044, lng: -122.8011 },
      destinationCoords: { lat: 48.4284, lng: -123.3656 },
      pickupTime: addDays(0, 17, 0),
      dropoffTime: addDays(0, 23, 0),
      weightLbs: 7500,
      commodity: 'Electronics',
      truckType: TRUCK_TYPES.DryVan,
      trailerLengthFt: 28,
      certifications: [],
      driverAssist: false,
    },
    // Load 103
    {
      companyId: companies.testCompany2._id,
      originAddress: 'Toronto, ON',
      destinationAddress: 'Montreal, QC',
      originCoords: { lat: 43.6532, lng: -79.3832 },
      destinationCoords: { lat: 45.5017, lng: -73.5673 },
      pickupTime: addDays(2, 13, 0),
      dropoffTime: addDays(3, 20, 0),
      weightLbs: 15000,
      commodity: 'Auto Parts',
      truckType: TRUCK_TYPES.DryVan,
      trailerLengthFt: 53,
      certifications: [],
      driverAssist: false,
    },
    // Load 104
    {
      companyId: companies.testCompany2._id,
      originAddress: 'Edmonton, AB',
      destinationAddress: 'Winnipeg, MB',
      originCoords: { lat: 53.5461, lng: -113.4937 },
      destinationCoords: { lat: 49.8951, lng: -97.1384 },
      pickupTime: addDays(6, 14, 0),
      dropoffTime: addDays(8, 1, 0),
      weightLbs: 38000,
      commodity: 'Grain',
      truckType: TRUCK_TYPES.Flatbed,
      trailerLengthFt: 40,
      certifications: [CERTIFICATIONS.Hazmat],
      driverAssist: false,
    },
    // Load 105
    {
      companyId: companies.testCompany1._id,
      originAddress: 'Calgary, AB',
      destinationAddress: 'Saskatoon, SK',
      originCoords: { lat: 51.0447, lng: -114.0719 },
      destinationCoords: { lat: 52.1332, lng: -106.67 },
      pickupTime: addDays(3, 15, 0),
      dropoffTime: addDays(3, 22, 0),
      weightLbs: 12000,
      commodity: 'Packaged Goods',
      truckType: TRUCK_TYPES.DryVan,
      trailerLengthFt: 53,
      certifications: [],
      driverAssist: false,
    },
    // Load 106
    {
      companyId: companies.testCompany1._id,
      originAddress: 'Vancouver, BC',
      destinationAddress: 'Edmonton, AB',
      originCoords: { lat: 49.2827, lng: -123.1207 },
      destinationCoords: { lat: 53.5461, lng: -113.4938 },
      pickupTime: addDays(4, 8, 0),
      dropoffTime: addDays(6, 18, 0),
      weightLbs: 18000,
      commodity: 'Furniture',
      truckType: TRUCK_TYPES.DryVan,
      trailerLengthFt: 48,
      certifications: [],
      driverAssist: true,
    },
    // Load 107
    {
      companyId: companies.testCompany2._id,
      originAddress: 'Edmonton, AB',
      destinationAddress: 'Winnipeg, MB',
      originCoords: { lat: 53.5461, lng: -113.4938 },
      destinationCoords: { lat: 49.8951, lng: -97.1384 },
      pickupTime: addDays(1, 6, 0),
      dropoffTime: addDays(3, 14, 0),
      weightLbs: 25000,
      commodity: 'Lumber',
      truckType: TRUCK_TYPES.DryVan,
      trailerLengthFt: 48,
      certifications: [],
      driverAssist: false,
    },
    // Load 108
    {
      companyId: companies.testCompany1._id,
      originAddress: 'Toronto, ON',
      destinationAddress: 'Montreal, QC',
      originCoords: { lat: 43.6532, lng: -79.3832 },
      destinationCoords: { lat: 45.5017, lng: -73.5673 },
      pickupTime: addDays(0, 10, 0),
      dropoffTime: addDays(2, 16, 0),
      weightLbs: 20000,
      commodity: 'Consumer Goods',
      truckType: TRUCK_TYPES.DryVan,
      trailerLengthFt: 53,
      certifications: [],
      driverAssist: false,
    },
    // Load 109: Vancouver -> Calgary
    {
      companyId: companies.testCompany2._id,
      originAddress: 'Vancouver, BC',
      destinationAddress: 'Calgary, AB',
      originCoords: { lat: 49.2827, lng: -123.1207 },
      destinationCoords: { lat: 51.0447, lng: -114.0719 },
      pickupTime: addDays(5, 7, 0),
      dropoffTime: addDays(6, 12, 0),
      weightLbs: 22000,
      commodity: 'Construction Materials',
      truckType: TRUCK_TYPES.DryVan,
      trailerLengthFt: 53,
      certifications: [],
      driverAssist: false,
    },
    // Load 110: Calgary -> Winnipeg
    {
      companyId: companies.testCompany1._id,
      originAddress: 'Calgary, AB',
      destinationAddress: 'Winnipeg, MB',
      originCoords: { lat: 51.0447, lng: -114.0719 },
      destinationCoords: { lat: 49.8951, lng: -97.1384 },
      pickupTime: addDays(7, 8, 0),
      dropoffTime: addDays(8, 18, 0),
      weightLbs: 30000,
      commodity: 'Steel Coils',
      truckType: TRUCK_TYPES.DryVan,
      trailerLengthFt: 48,
      certifications: [CERTIFICATIONS.DangerousGoods],
      driverAssist: true,
    },
    // Load 111: Winnipeg -> Toronto
    {
      companyId: companies.testCompany2._id,
      originAddress: 'Winnipeg, MB',
      destinationAddress: 'Toronto, ON',
      originCoords: { lat: 49.8951, lng: -97.1384 },
      destinationCoords: { lat: 43.6532, lng: -79.3832 },
      pickupTime: addDays(9, 6, 0),
      dropoffTime: addDays(11, 20, 0),
      weightLbs: 40000,
      commodity: 'Machinery Parts',
      truckType: TRUCK_TYPES.DryVan,
      trailerLengthFt: 53,
      certifications: [],
      driverAssist: false,
    },
    // Load 112: Toronto -> Montreal
    {
      companyId: companies.testCompany1._id,
      originAddress: 'Toronto, ON',
      destinationAddress: 'Montreal, QC',
      originCoords: { lat: 43.6532, lng: -79.3832 },
      destinationCoords: { lat: 45.5017, lng: -73.5673 },
      pickupTime: addDays(12, 9, 0),
      dropoffTime: addDays(13, 15, 0),
      weightLbs: 18000,
      commodity: 'Pharmaceuticals',
      truckType: TRUCK_TYPES.DryVan,
      trailerLengthFt: 53,
      certifications: [CERTIFICATIONS.ReeferHACCP],
      driverAssist: false,
    },
    // Load 113: Saskatoon -> Regina
    {
      companyId: companies.testCompany2._id,
      originAddress: 'Saskatoon, SK',
      destinationAddress: 'Regina, SK',
      originCoords: { lat: 52.1332, lng: -106.67 },
      destinationCoords: { lat: 50.4452, lng: -104.6189 },
      pickupTime: addDays(14, 11, 0),
      dropoffTime: addDays(14, 18, 0),
      weightLbs: 28000,
      commodity: 'Oilfield Equipment',
      truckType: TRUCK_TYPES.DryVan,
      trailerLengthFt: 40,
      certifications: [],
      driverAssist: false,
    },
    // Load 114: Halifax -> St. John's
    {
      companyId: companies.testCompany1._id,
      originAddress: 'Halifax, NS',
      destinationAddress: "St. John's, NL",
      originCoords: { lat: 44.6426, lng: -63.6277 },
      destinationCoords: { lat: 47.5211, lng: -52.7816 },
      pickupTime: addDays(15, 13, 0),
      dropoffTime: addDays(17, 22, 0),
      weightLbs: 35000,
      commodity: 'Seafood Products',
      truckType: TRUCK_TYPES.DryVan,
      trailerLengthFt: 53,
      certifications: [CERTIFICATIONS.CustomsFAST, CERTIFICATIONS.TWIC],
      driverAssist: true,
    },
    // Load 115: Montreal -> Quebec City (company1)
    {
      companyId: companies.testCompany1._id,
      originAddress: 'Montreal, QC',
      destinationAddress: 'Quebec City, QC',
      originCoords: { lat: 45.5017, lng: -73.5673 },
      destinationCoords: { lat: 46.8139, lng: -71.208 },
      pickupTime: addDays(2, 7, 0),
      dropoffTime: addDays(2, 19, 0),
      weightLbs: 16000,
      commodity: 'Beverages',
      truckType: TRUCK_TYPES.Reefer,
      trailerLengthFt: 48,
      certifications: [CERTIFICATIONS.ReeferHACCP],
      driverAssist: false,
    },
    // Load 116: Vancouver -> Kamloops (company1)
    {
      companyId: companies.testCompany1._id,
      originAddress: 'Vancouver, BC',
      destinationAddress: 'Kamloops, BC',
      originCoords: { lat: 49.2827, lng: -123.1207 },
      destinationCoords: { lat: 50.6745, lng: -120.3273 },
      pickupTime: addDays(3, 9, 0),
      dropoffTime: addDays(3, 17, 0),
      weightLbs: 14000,
      commodity: 'Produce',
      truckType: TRUCK_TYPES.Reefer,
      trailerLengthFt: 53,
      certifications: [CERTIFICATIONS.ReeferHACCP],
      driverAssist: false,
    },
    // Load 117: Toronto -> Ottawa (company2, tanker)
    {
      companyId: companies.testCompany2._id,
      originAddress: 'Toronto, ON',
      destinationAddress: 'Ottawa, ON',
      originCoords: { lat: 43.6532, lng: -79.3832 },
      destinationCoords: { lat: 45.4215, lng: -75.6972 },
      pickupTime: addDays(4, 11, 0),
      dropoffTime: addDays(4, 21, 0),
      weightLbs: 33000,
      commodity: 'Liquid Fertilizer',
      truckType: TRUCK_TYPES.Tanker,
      trailerLengthFt: 40,
      certifications: [CERTIFICATIONS.Tanker, CERTIFICATIONS.Hazmat],
      driverAssist: false,
    },
    // Load 118: Calgary -> Regina (company2, power only)
    {
      companyId: companies.testCompany2._id,
      originAddress: 'Calgary, AB',
      destinationAddress: 'Regina, SK',
      originCoords: { lat: 51.0447, lng: -114.0719 },
      destinationCoords: { lat: 50.4452, lng: -104.6189 },
      pickupTime: addDays(5, 14, 0),
      dropoffTime: addDays(6, 8, 0),
      weightLbs: 21000,
      commodity: 'Retail Goods',
      truckType: TRUCK_TYPES.PowerOnly,
      trailerLengthFt: 53,
      certifications: [],
      driverAssist: false,
    },
    // Load 127: Vancouver -> Abbotsford (company1, demo load — very high match for testUser1)
    // createdAt is bumped a couple minutes into the future (relative to seed
    // run time) so it deterministically sorts first in the createdAt-desc
    // company load table, regardless of Promise.all creation-order jitter.
    {
      companyId: companies.testCompany1._id,
      createdAt: new Date(Date.now() + 2 * 60 * 1000),
      originAddress: 'Vancouver, BC',
      destinationAddress: 'Abbotsford, BC',
      originCoords: { lat: 49.2827, lng: -123.1207 },
      destinationCoords: { lat: 49.0504, lng: -122.3045 },
      pickupTime: addDays(0, 18, 0),
      dropoffTime: addDays(0, 22, 0),
      weightLbs: 16000,
      commodity: 'Apples',
      truckType: TRUCK_TYPES.Reefer,
      trailerLengthFt: 48,
      certifications: [CERTIFICATIONS.ReeferHACCP],
      driverAssist: false,
    },
  ]

  const completedLoads = [
    // Completed load 119 — testUser1 hauled for company1
    {
      _id: COMPLETED_LOAD_IDS['000000000000000000000119'],
      companyId: companies.testCompany1._id,
      assignedDriverId: drivers.testUser1._id,
      originAddress: 'Calgary, AB',
      destinationAddress: 'Vancouver, BC',
      originCoords: { lat: 51.0447, lng: -114.0719 },
      destinationCoords: { lat: 49.2827, lng: -123.1207 },
      pickupTime: pastDays(30, 8, 0),
      dropoffTime: pastDays(28, 18, 0),
      weightLbs: 24000,
      commodity: 'Building Supplies',
      truckType: TRUCK_TYPES.DryVan,
      trailerLengthFt: 53,
      certifications: [],
      driverAssist: false,
    },
    // Completed load 120 — testUser3 hauled for company2
    {
      _id: COMPLETED_LOAD_IDS['000000000000000000000120'],
      companyId: companies.testCompany2._id,
      assignedDriverId: drivers.testUser3._id,
      originAddress: 'Regina, SK',
      destinationAddress: 'Winnipeg, MB',
      originCoords: { lat: 50.4452, lng: -104.6189 },
      destinationCoords: { lat: 49.8951, lng: -97.1384 },
      pickupTime: pastDays(24, 6, 0),
      dropoffTime: pastDays(24, 14, 0),
      weightLbs: 19000,
      commodity: 'Grain Bags',
      truckType: TRUCK_TYPES.DryVan,
      trailerLengthFt: 53,
      certifications: [],
      driverAssist: false,
    },
    // Completed load 121 — testUser4 hauled for company1 (reefer)
    {
      _id: COMPLETED_LOAD_IDS['000000000000000000000121'],
      companyId: companies.testCompany1._id,
      assignedDriverId: drivers.testUser4._id,
      originAddress: 'Toronto, ON',
      destinationAddress: 'London, ON',
      originCoords: { lat: 43.6532, lng: -79.3832 },
      destinationCoords: { lat: 42.9849, lng: -81.2453 },
      pickupTime: pastDays(18, 7, 0),
      dropoffTime: pastDays(18, 13, 0),
      weightLbs: 17000,
      commodity: 'Frozen Food',
      truckType: TRUCK_TYPES.Reefer,
      trailerLengthFt: 53,
      certifications: [CERTIFICATIONS.ReeferHACCP],
      driverAssist: false,
    },
    // Completed load 122 — testUser2 hauled for company2 (flatbed)
    {
      _id: COMPLETED_LOAD_IDS['000000000000000000000122'],
      companyId: companies.testCompany2._id,
      assignedDriverId: drivers.testUser2._id,
      originAddress: 'Winnipeg, MB',
      destinationAddress: 'Thunder Bay, ON',
      originCoords: { lat: 49.8951, lng: -97.1384 },
      destinationCoords: { lat: 48.3809, lng: -89.2477 },
      pickupTime: pastDays(14, 9, 0),
      dropoffTime: pastDays(13, 12, 0),
      weightLbs: 36000,
      commodity: 'Heavy Machinery',
      truckType: TRUCK_TYPES.Flatbed,
      trailerLengthFt: 48,
      certifications: [CERTIFICATIONS.Hazmat],
      driverAssist: false,
    },
    // Completed load 123 — testUser5 hauled for company1 (historical for testUser5)
    {
      _id: COMPLETED_LOAD_IDS['000000000000000000000123'],
      companyId: companies.testCompany1._id,
      assignedDriverId: drivers.testUser5._id,
      originAddress: 'Vancouver, BC',
      destinationAddress: 'Kelowna, BC',
      originCoords: { lat: 49.2827, lng: -123.1207 },
      destinationCoords: { lat: 49.888, lng: -119.496 },
      pickupTime: pastDays(10, 8, 0),
      dropoffTime: pastDays(10, 16, 0),
      weightLbs: 27000,
      commodity: 'Steel Beams',
      truckType: TRUCK_TYPES.StepDeck,
      trailerLengthFt: 48,
      certifications: [],
      driverAssist: false,
    },
    // Completed load 124 — testUser5 hauled for company2 (second historical for testUser5)
    {
      _id: COMPLETED_LOAD_IDS['000000000000000000000124'],
      companyId: companies.testCompany2._id,
      assignedDriverId: drivers.testUser5._id,
      originAddress: 'Edmonton, AB',
      destinationAddress: 'Red Deer, AB',
      originCoords: { lat: 53.5461, lng: -113.4938 },
      destinationCoords: { lat: 52.2681, lng: -113.8112 },
      pickupTime: pastDays(7, 10, 0),
      dropoffTime: pastDays(7, 15, 0),
      weightLbs: 15000,
      commodity: 'Paper Products',
      truckType: TRUCK_TYPES.StepDeck,
      trailerLengthFt: 48,
      certifications: [],
      driverAssist: false,
    },
    // Completed load 125 — testUser3 hauled for company1 (second historical for testUser3)
    {
      _id: COMPLETED_LOAD_IDS['000000000000000000000125'],
      companyId: companies.testCompany1._id,
      assignedDriverId: drivers.testUser3._id,
      originAddress: 'Montreal, QC',
      destinationAddress: 'Sherbrooke, QC',
      originCoords: { lat: 45.5017, lng: -73.5673 },
      destinationCoords: { lat: 45.4, lng: -71.8928 },
      pickupTime: pastDays(5, 11, 0),
      dropoffTime: pastDays(5, 18, 0),
      weightLbs: 31000,
      commodity: 'Fuel Additives',
      truckType: TRUCK_TYPES.DryVan,
      trailerLengthFt: 40,
      certifications: [],
      driverAssist: false,
    },
    // Completed load 126 — testUser2 hauled for company2 (second historical for testUser2)
    {
      _id: COMPLETED_LOAD_IDS['000000000000000000000126'],
      companyId: companies.testCompany2._id,
      assignedDriverId: drivers.testUser2._id,
      originAddress: 'Winnipeg, MB',
      destinationAddress: 'Brandon, MB',
      originCoords: { lat: 49.8951, lng: -97.1384 },
      destinationCoords: { lat: 49.8483, lng: -99.9493 },
      pickupTime: pastDays(3, 7, 0),
      dropoffTime: pastDays(3, 12, 0),
      weightLbs: 13000,
      commodity: 'Packaged Food',
      truckType: TRUCK_TYPES.Flatbed,
      trailerLengthFt: 48,
      certifications: [CERTIFICATIONS.Hazmat],
      driverAssist: false,
    },
  ]

  const createdActive = await Promise.all(
    activeLoads.map((load, index) =>
      LoadModel.create({
        _id: ACTIVE_LOAD_IDS[index],
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
        ...('createdAt' in load ? { createdAt: (load as { createdAt: Date }).createdAt } : {}),
      })
    )
  )

  const createdCompleted = await Promise.all(
    completedLoads.map((load) =>
      LoadModel.create({
        _id: load._id,
        companyId: load.companyId,
        createdBy: load.companyId,
        assignedDriverId: load.assignedDriverId,
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
        status: LOAD_STATUSES.Completed,
      })
    )
  )

  return { activeLoads: createdActive, completedLoads: createdCompleted }
}