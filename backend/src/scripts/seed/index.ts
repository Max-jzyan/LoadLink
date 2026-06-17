import 'dotenv/config'
import mongoose from 'mongoose'
import { seedAuctions } from './auctions'
import { seedBids } from './bids'
import { seedLoads } from './loads'
import { seedUsers } from './users'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://mongo:27017/loadlink'

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

    // Distribute bids across all auction loads
    for (const auction of auctions) {
      const load = loads.find((l) => l._id.toString() === auction.loadId.toString())
      if (load) {
        await seedBids({
          loadId: load._id,
          auctionId: auction._id,
          driverIds: [drivers.sam._id, drivers.alex._id],
        })
      }
    }

    console.log(`SEEDED ${loads.length} loads, ${auctions.length} auctions`)
    process.exit(0)
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}

main()
