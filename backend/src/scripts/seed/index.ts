import 'dotenv/config'
import mongoose, { Types } from 'mongoose'
import { BidModel } from '../../models/loads/Bid'
import { seedAuctions } from './auctions'
import { seedBids } from './bids'
import { seedLoads } from './loads'
import { seedUsers } from './users'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://mongo:27017/loadlink'

const BID_IDS_BY_LOAD: Record<string, [string, string]> = {
  '000000000000000000000102': ['000000000000000000000302', '000000000000000000000402'],
  '000000000000000000000103': ['000000000000000000000303', '000000000000000000000403'],
  '000000000000000000000105': ['000000000000000000000305', '000000000000000000000405'],
  '000000000000000000000106': ['000000000000000000000306', '000000000000000000000406'],
  '000000000000000000000108': ['000000000000000000000308', '000000000000000000000408'],
  '000000000000000000000110': ['000000000000000000000310', '000000000000000000000410'],
  '000000000000000000000111': ['000000000000000000000311', '000000000000000000000411'],
  '000000000000000000000112': ['000000000000000000000312', '000000000000000000000412'], // Near expiry demo
}

// Bid amounts for the lots of bids demo auction 113
const MANY_BID_AMOUNTS = [820, 838, 855, 867, 879, 892, 906, 918, 931, 947, 963, 1000]

async function main() {
  await mongoose.connect(MONGODB_URI)
  try {
    const { companies, drivers } = await seedUsers()

    const loads = await seedLoads({
      companies: {
        greenleaf: companies.greenleaf._id,
        northern: companies.northern._id,
      },
      drivers: {
        sam: drivers.sam._id,
        alex: drivers.alex._id,
      },
    })

    const auctions = await seedAuctions(loads)

    // Distribute bids across all auction loads (clear once, then seed per auction)
    await BidModel.deleteMany({})
    let bidCount = 0
    for (const auction of auctions) {
      const bidIds = BID_IDS_BY_LOAD[auction.loadId.toString()]
      if (bidIds) {
        const bids = await seedBids({
          loadId: auction.loadId,
          auctionId: auction._id,
          driverIds: [drivers.sam._id, drivers.alex._id],
          bidIds: [new Types.ObjectId(bidIds[0]), new Types.ObjectId(bidIds[1])],
        })
        bidCount += bids.length
      }
    }

    // Lots of bids seed
    const auction113 = auctions.find((a) => a.loadId.toString() === '000000000000000000000113')
    if (auction113) {
      // IDs 000000000000000000000500 → 000000000000000000000511
      const manyBids = MANY_BID_AMOUNTS.map((amount, i) => ({
        _id: new Types.ObjectId(`000000000000000000000${500 + i}`),
        loadId: auction113.loadId,
        auctionId: auction113._id,
        driverId: i % 2 === 0 ? drivers.sam._id : drivers.alex._id,
        amount,
      }))

      await BidModel.create(manyBids)
      // Track the bestBidAmount on the auction so heartbeat auto accept works
      ;(auction113 as any).bestBidAmount = MANY_BID_AMOUNTS[0]
      await (auction113 as any).save()
      bidCount += manyBids.length
    }

    const userCount = Object.keys(companies).length + Object.keys(drivers).length
    console.log(
      `SEEDED ${userCount} users, ${loads.length} loads, ${auctions.length} auctions, ${bidCount} bids`
    )
    process.exit(0)
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}

main()
