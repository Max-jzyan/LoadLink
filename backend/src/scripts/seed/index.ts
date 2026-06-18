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
}

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
