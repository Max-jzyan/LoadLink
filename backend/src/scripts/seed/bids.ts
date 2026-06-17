import { Types } from 'mongoose'
import { BidModel } from '../../models/loads/Bid'

export async function seedBids({
  loadId,
  auctionId,
  driverIds,
  bidIds,
}: {
  loadId: Types.ObjectId
  auctionId: Types.ObjectId
  driverIds: Types.ObjectId[]
  bidIds: Types.ObjectId[]
}) {
  const [samId, alexId] = driverIds
  const [samBidId, alexBidId] = bidIds

  const bids = await BidModel.create([
    { _id: samBidId, loadId, auctionId, driverId: samId, amount: 980 },
    { _id: alexBidId, loadId, auctionId, driverId: alexId, amount: 1050 },
  ])

  return bids
}
