import { Types } from 'mongoose'
import { BidModel } from '../../models/loads/Bid'
import { BID_STATUSES } from '../../models/enums'

export async function seedBids({
  loadId,
  auctionId,
  bids,
}: {
  loadId: Types.ObjectId
  auctionId: Types.ObjectId
  bids: Array<{ _id: Types.ObjectId; driverId: Types.ObjectId; amount: number }>
}) {
  return BidModel.create(
    bids.map((bid) => ({
      _id: bid._id,
      loadId,
      auctionId,
      driverId: bid.driverId,
      amount: bid.amount,
      status: BID_STATUSES.Submitted,
    }))
  )
}
