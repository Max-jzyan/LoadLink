import { Router } from 'express'
import {
  acceptBid,
  cancelAuction,
  claimLoad,
  createAuction,
  placeBid,
  streamBids,
  streamPrice,
  updateAuction,
} from '../controllers/auctionController'

const router = Router()

router.post('/auctions/:loadId', createAuction)
router.get('/auctions/:loadId/bids', streamBids)
router.get('/auctions/:loadId/price', streamPrice)
router.patch('/auctions/:loadId/bids/:bidId', acceptBid)
router.patch('/auctions/:loadId', updateAuction)
router.delete('/auctions/:loadId', cancelAuction)

// Auction actions (driver-initiated)
router.post('/auctions/:loadId/bids', placeBid)
router.post('/auctions/:loadId/claim', claimLoad)

export default router
