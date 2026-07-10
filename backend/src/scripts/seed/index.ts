import 'dotenv/config'
import mongoose, { Types } from 'mongoose'
import { BidModel } from '../../models/loads/Bid'
import { seedAuctions } from './auctions'
import { seedBids } from './bids'
import { seedLoads } from './loads'
import { seedUsers, type SeedDriverKey } from './users'
import { seedTrucks } from './trucks'
import { seedReviews } from './reviews'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://mongo:27017/loadlink'

const BID_SPECS_BY_LOAD: Record<
  string,
  Array<{ id: string; driverKey: SeedDriverKey; amount: number }>
> = {
  '000000000000000000000101': [
    { id: '000000000000000000000301', driverKey: 'testUser1', amount: 930 },
    { id: '000000000000000000000302', driverKey: 'testUser3', amount: 975 },
    { id: '000000000000000000000303', driverKey: 'testUser5', amount: 1010 },
  ],
  '000000000000000000000102': [
    { id: '000000000000000000000304', driverKey: 'testUser2', amount: 540 },
    { id: '000000000000000000000305', driverKey: 'testUser4', amount: 515 },
  ],
  '000000000000000000000103': [
    { id: '000000000000000000000306', driverKey: 'testUser1', amount: 815 },
    { id: '000000000000000000000307', driverKey: 'testUser2', amount: 790 },
    { id: '000000000000000000000308', driverKey: 'testUser4', amount: 835 },
  ],
  '000000000000000000000104': [
    { id: '000000000000000000000309', driverKey: 'testUser3', amount: 1225 },
    { id: '000000000000000000000310', driverKey: 'testUser5', amount: 1190 },
  ],
  '000000000000000000000106': [
    { id: '000000000000000000000311', driverKey: 'testUser2', amount: 1050 },
    { id: '000000000000000000000312', driverKey: 'testUser4', amount: 1080 },
  ],
  '000000000000000000000107': [
    { id: '000000000000000000000313', driverKey: 'testUser3', amount: 3194 },
    { id: '000000000000000000000314', driverKey: 'testUser5', amount: 3299 },
  ],
  '000000000000000000000108': [
    { id: '000000000000000000000315', driverKey: 'testUser2', amount: 2952 },
    { id: '000000000000000000000316', driverKey: 'testUser4', amount: 3056 },
    { id: '000000000000000000000317', driverKey: 'testUser5', amount: 3126 },
  ],
}

async function main() {
  await mongoose.connect(MONGODB_URI)
  try {
    const { companies, drivers } = await seedUsers()

    const loads = await seedLoads({
      companies: {
        testCompany1: companies.testCompany1._id,
        testCompany2: companies.testCompany2._id,
      },
    })

    const auctions = await seedAuctions(loads)

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

    const reviews = await seedReviews(
      loads,
      {
        testCompany1: { _id: companies.testCompany1._id },
        testCompany2: { _id: companies.testCompany2._id },
      },
      drivers
    )

    const userCount = Object.keys(companies).length + Object.keys(drivers).length
    console.log(
      `SEEDED ${userCount} users, ${loads.length} loads, ${auctions.length} auctions, ${bidCount} bids, ${trucks.length} trucks, ${reviews.length} reviews`
    )
    process.exit(0)
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}

main()
