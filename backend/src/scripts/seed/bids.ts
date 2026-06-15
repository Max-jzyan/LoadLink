import { Types } from 'mongoose'
import { BidModel } from '../../models/loads/Bid'

export async function seedBids({
  loadId,
  auctionId,
  driverIds,
}: {
  loadId: Types.ObjectId
  auctionId: Types.ObjectId
  driverIds: Types.ObjectId[]
}) {
  await BidModel.deleteMany({})

  const [samId, alexId] = driverIds

  const bids = await BidModel.create([
    { loadId, auctionId, driverId: samId, amount: 980 },
    { loadId, auctionId, driverId: alexId, amount: 1050 },
  ])

  return bids
}
