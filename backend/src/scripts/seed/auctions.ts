import { Types } from 'mongoose'
import { AuctionModel } from '../../models/loads/Auction'
import { AUCTION_STATUSES, CURRENCIES } from '../../models/enums'
import { LOAD_STATUSES } from '../../models/enums'

const AUCTION_ID_BY_LOAD: Record<string, string> = {
  '000000000000000000000102': '000000000000000000000202',
  '000000000000000000000103': '000000000000000000000203',
  '000000000000000000000105': '000000000000000000000205',
  '000000000000000000000106': '000000000000000000000206',
  '000000000000000000000108': '000000000000000000000208',
  '000000000000000000000110': '000000000000000000000210',
  '000000000000000000000111': '000000000000000000000211',
}

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
        _id: new Types.ObjectId(AUCTION_ID_BY_LOAD[load._id.toString()]),
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
