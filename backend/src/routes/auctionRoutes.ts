import { Router } from 'express'
import {
  streamBids,
  streamPrice,
  acceptBid,
  updateAuction,
  cancelAuction,
} from '../controllers/auctionController'

const router = Router()

router.get('/auctions/:loadId/bids', streamBids)
router.get('/auctions/:loadId/price', streamPrice)
router.patch('/auctions/:loadId/bids/:bidId', acceptBid)
router.patch('/auctions/:loadId', updateAuction)
router.delete('/auctions/:loadId', cancelAuction)

export default router
