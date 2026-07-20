import 'dotenv/config'
import mongoose, { Types } from 'mongoose'
import { BidModel } from '../../models/loads/Bid'
import { NotificationModel } from '../../models/notifications/Notification'
import { BlocklistModel } from '../../models/blocklist/Blocklist'
import { ReportModel } from '../../models/reports/Report'
import { TrailerModel } from '../../models/trucks/Trailer'
import { seedAuctions } from './auctions'
import { seedBids } from './bids'
import { seedLoads } from './loads'
import { seedUsers, type SeedDriverKey } from './users'
import { seedTrucks } from './trucks'
import { seedTrailers } from './trailers'
import { seedReviews } from './reviews'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://mongo:27017/loadlink'

const BID_SPECS_BY_LOAD: Record<
  string,
  Array<{ id: string; driverKey: SeedDriverKey; amount: number }>
> = {
  '000000000000000000000101': [
    { id: '000000000000000000000301', driverKey: 'testUser1', amount: 930 },
    { id: '000000000000000000000302', driverKey: 'testUser3', amount: 975 },
    { id: '000000000000000000000303', driverKey: 'testUser4', amount: 1010 },
    { id: '000000000000000000000361', driverKey: 'testUser2', amount: 4800 }, // way out outlier
  ],
  '000000000000000000000102': [
    { id: '000000000000000000000304', driverKey: 'testUser2', amount: 540 },
    { id: '000000000000000000000305', driverKey: 'testUser4', amount: 515 },
    { id: '000000000000000000000362', driverKey: 'testUser1', amount: 2480 }, // absurdly high outlier (still above currentPrice)
  ],
  '000000000000000000000103': [
    { id: '000000000000000000000306', driverKey: 'testUser1', amount: 815 },
    { id: '000000000000000000000307', driverKey: 'testUser2', amount: 790 },
    { id: '000000000000000000000308', driverKey: 'testUser4', amount: 835 },
  ],
  '000000000000000000000104': [
    { id: '000000000000000000000309', driverKey: 'testUser3', amount: 1225 },
    { id: '000000000000000000000310', driverKey: 'testUser4', amount: 1190 },
    { id: '000000000000000000000363', driverKey: 'testUser1', amount: 4200 }, // way out outlier
  ],
  '000000000000000000000105': [
    { id: '000000000000000000000311', driverKey: 'testUser1', amount: 910 },
    { id: '000000000000000000000312', driverKey: 'testUser3', amount: 935 },
  ],
  '000000000000000000000106': [
    { id: '000000000000000000000313', driverKey: 'testUser2', amount: 1050 },
    { id: '000000000000000000000314', driverKey: 'testUser4', amount: 1080 },
    { id: '000000000000000000000364', driverKey: 'testUser3', amount: 5200 }, // absurdly high outlier (still above currentPrice)
  ],
  '000000000000000000000107': [
    { id: '000000000000000000000315', driverKey: 'testUser3', amount: 3194 },
    { id: '000000000000000000000316', driverKey: 'testUser4', amount: 3299 },
  ],
  '000000000000000000000108': [
    { id: '000000000000000000000317', driverKey: 'testUser1', amount: 2952 },
    { id: '000000000000000000000318', driverKey: 'testUser2', amount: 3056 },
    { id: '000000000000000000000319', driverKey: 'testUser4', amount: 3126 },
  ],
  '000000000000000000000109': [
    { id: '000000000000000000000320', driverKey: 'testUser3', amount: 980 },
    { id: '000000000000000000000321', driverKey: 'testUser4', amount: 1010 },
    { id: '000000000000000000000365', driverKey: 'testUser1', amount: 5500 }, // way out outlier
  ],
  '000000000000000000000110': [
    { id: '000000000000000000000322', driverKey: 'testUser1', amount: 1150 },
    { id: '000000000000000000000323', driverKey: 'testUser2', amount: 1180 },
  ],
  '000000000000000000000111': [
    { id: '000000000000000000000324', driverKey: 'testUser3', amount: 1490 },
    { id: '000000000000000000000325', driverKey: 'testUser4', amount: 1520 },
    { id: '000000000000000000000326', driverKey: 'testUser1', amount: 1525 },
  ],
  '000000000000000000000112': [
    { id: '000000000000000000000327', driverKey: 'testUser1', amount: 820 },
    { id: '000000000000000000000328', driverKey: 'testUser2', amount: 850 },
  ],
  '000000000000000000000113': [
    { id: '000000000000000000000329', driverKey: 'testUser3', amount: 610 },
    { id: '000000000000000000000330', driverKey: 'testUser4', amount: 625 },
  ],
  '000000000000000000000114': [
    { id: '000000000000000000000331', driverKey: 'testUser1', amount: 1750 },
    { id: '000000000000000000000332', driverKey: 'testUser2', amount: 1810 },
    { id: '000000000000000000000333', driverKey: 'testUser4', amount: 1780 },
  ],
  '000000000000000000000115': [
    { id: '000000000000000000000334', driverKey: 'testUser3', amount: 830 },
    { id: '000000000000000000000335', driverKey: 'testUser4', amount: 860 },
    { id: '000000000000000000000366', driverKey: 'testUser1', amount: 2900 }, // absurdly high outlier (still above currentPrice)
  ],
  '000000000000000000000116': [
    { id: '000000000000000000000336', driverKey: 'testUser1', amount: 720 },
    { id: '000000000000000000000337', driverKey: 'testUser3', amount: 750 },
  ],
  '000000000000000000000117': [
    { id: '000000000000000000000338', driverKey: 'testUser2', amount: 1620 },
    { id: '000000000000000000000339', driverKey: 'testUser4', amount: 1655 },
    { id: '000000000000000000000367', driverKey: 'testUser3', amount: 6200 }, // way out outlier
  ],
  '000000000000000000000118': [
    { id: '000000000000000000000340', driverKey: 'testUser1', amount: 960 },
    { id: '000000000000000000000341', driverKey: 'testUser3', amount: 990 },
  ],
}

async function main() {
  await mongoose.connect(MONGODB_URI)
  try {
    // Clear transient collections to ensure clean state between instantiations
    await NotificationModel.deleteMany({})
    await BlocklistModel.deleteMany({})
    await ReportModel.deleteMany({})

    const { companies, drivers } = await seedUsers()

    const { activeLoads, completedLoads } = await seedLoads({
      companies: {
        testCompany1: companies.testCompany1._id,
        testCompany2: companies.testCompany2._id,
      },
      drivers: {
        testUser1: drivers.testUser1._id,
        testUser2: drivers.testUser2._id,
        testUser3: drivers.testUser3._id,
        testUser4: drivers.testUser4._id,
        testUser5: drivers.testUser5._id,
      },
    })

    const auctions = await seedAuctions({ loads: activeLoads, completedLoads })

    await BidModel.deleteMany({})

    let bidCount = 0
    for (const auction of auctions) {
      const bidSpecs = BID_SPECS_BY_LOAD[auction.loadId.toString()] ?? []
      const bids = await seedBids({
        loadId: auction.loadId,
        auctionId: auction._id,
        bids: bidSpecs.map((bid) => ({
          _id: new Types.ObjectId(bid.id),
          driverId: drivers[bid.driverKey]._id,
          amount: bid.amount,
        })),
      })

      if (bids.length > 0) {
        auction.bestBidAmount = Math.min(...bids.map((bid) => bid.amount))
        await auction.save()
      }

      bidCount += bids.length
    }

    const trucks = await seedTrucks(drivers)

    const trailers = await seedTrailers(drivers)

    const reviews = await seedReviews(
      [...activeLoads, ...completedLoads],
      {
        testCompany1: { _id: companies.testCompany1._id },
        testCompany2: { _id: companies.testCompany2._id },
      },
      drivers
    )

    // Update completedLoadsCount on drivers that have historical hauls
    const driverLoadCounts = completedLoads.reduce<Record<string, number>>((acc, load) => {
      if (!load.assignedDriverId) return acc
      const key = load.assignedDriverId.toString()
      acc[key] = (acc[key] ?? 0) + 1
      return acc
    }, {})
    for (const driverKey of Object.keys(drivers) as SeedDriverKey[]) {
      const count = driverLoadCounts[drivers[driverKey]._id.toString()]
      if (count) {
        await drivers[driverKey].updateOne({ completedLoadsCount: count })
      }
    }

    const userCount = Object.keys(companies).length + Object.keys(drivers).length
    console.log(
      `SEEDED ${userCount} users, ${activeLoads.length + completedLoads.length} loads, ${auctions.length + completedLoads.length} auctions, ${bidCount} bids, ${trucks.length} trucks, ${trailers.length} trailers, ${reviews.length} reviews`
    )
    process.exit(0)
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}

main()