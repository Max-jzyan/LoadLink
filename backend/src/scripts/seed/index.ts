import 'dotenv/config'
import mongoose from 'mongoose'
import { seedUsers } from './users'
import { seedLoads } from './loads'
import { seedAuctions } from './auctions'
import { seedBids } from './bids'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://mongo:27017/loadlink'

async function main() {
  await mongoose.connect(MONGODB_URI)
  try {
    const { company, drivers } = await seedUsers()
    const load = await seedLoads({ companyId: company._id })
    const auction = await seedAuctions({ loadId: load._id, companyId: company._id })
    await seedBids({
      loadId: load._id,
      auctionId: auction._id,
      driverIds: drivers.map((driver) => driver._id),
    })

    console.log('SEEDED loadId=' + load._id.toString())
  } finally {
    await mongoose.disconnect()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
