import { Types } from 'mongoose'
import { AuctionModel } from '../../models/loads/Auction'
import { AUCTION_STATUSES, CURRENCIES } from '../../models/enums'

export async function seedAuctions({
  loadId,
  companyId,
}: {
  loadId: Types.ObjectId
  companyId: Types.ObjectId
}) {
  await AuctionModel.deleteMany({})

  const auction = await AuctionModel.create({
    loadId,
    companyId,
    startPrice: 800,
    capPrice: 1200,
    priceCreepAmount: 10,
    priceCreepIntervalHours: 1,
    currentPrice: 847,
    currency: CURRENCIES.CAD,
    expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
    status: AUCTION_STATUSES.Active,
  })

  return auction
}
