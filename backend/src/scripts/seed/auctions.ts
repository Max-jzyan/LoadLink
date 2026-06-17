import { Types } from 'mongoose'
import { AuctionModel } from '../../models/loads/Auction'
import { AUCTION_STATUSES, CURRENCIES } from '../../models/enums'
import { LOAD_STATUSES } from '../../models/enums'

/**
 * Seed the auctions collection: create an auction for each load that has
 * an `auction_live` status.
 */
export async function seedAuctions(
  loads: Array<{ _id: Types.ObjectId; companyId: Types.ObjectId; status: string }>
) {
  await AuctionModel.deleteMany({})

  const auctionLoads = loads.filter((l) => l.status === LOAD_STATUSES.AuctionLive)

  const auctions = await Promise.all(
    auctionLoads.map((load) =>
      AuctionModel.create({
        loadId: load._id,
        companyId: load.companyId,
        startPrice: 800,
        capPrice: 1200,
        priceCreepAmount: 10,
        priceCreepIntervalHours: 1,
        currentPrice: 850,
        currency: CURRENCIES.CAD,
        expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours from now
        status: AUCTION_STATUSES.Active,
      })
    )
  )

  return auctions
}
