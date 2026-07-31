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
  bids: Array<{
    _id: Types.ObjectId
    driverId: Types.ObjectId
    amount: number
    status?: (typeof BID_STATUSES)[keyof typeof BID_STATUSES]
    acceptedAt?: Date
  }>
}) {
  return BidModel.create(
    bids.map((bid) => {
      const status = bid.status ?? BID_STATUSES.Submitted
      return {
        _id: bid._id,
        loadId,
        auctionId,
        driverId: bid.driverId,
        amount: bid.amount,
        status,
        acceptedAt: status === BID_STATUSES.Accepted ? (bid.acceptedAt ?? new Date()) : null,
      }
    })
  )
}
