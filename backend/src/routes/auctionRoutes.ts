import { Router } from 'express'
import {
  acceptBid,
  cancelAuction,
  claimLoad,
  createAuction,
  getCompanyAuctions,
  placeBid,
  reopenAuction,
  streamBids,
  streamPrice,
  updateAuction,
} from '../controllers/auctionController'
import { requireAuth, requireAuthSSE } from '../middleware/requireAuth'
import {
  requireRole,
  requireOwns,
  requireSelfParam,
  companyOwnsLoad,
  notBlockedByLoadCompany,
  notBlockedFromBidDriver,
} from '../middleware/authorize'
import { USER_ROLES } from '../models/enums'

const router = Router()

// Company managing the auction for a load it owns.
const middlewares = [requireAuth, requireRole(USER_ROLES.COMPANY), requireOwns(companyOwnsLoad)]

router.post('/auctions/:loadId', middlewares, createAuction)
router.patch('/auctions/:loadId/bids/:bidId', [...middlewares, notBlockedFromBidDriver], acceptBid)
router.patch('/auctions/:loadId', middlewares, updateAuction)
router.delete('/auctions/:loadId', middlewares, cancelAuction)
router.post('/auctions/:loadId/reopen', middlewares, reopenAuction)

// SSE streams
router.get('/auctions/:loadId/bids', requireAuthSSE, notBlockedByLoadCompany, streamBids)
router.get('/auctions/:loadId/price', requireAuthSSE, notBlockedByLoadCompany, streamPrice)

// Auction actions (driver-initiated)
router.post(
  '/auctions/:loadId/bids',
  requireAuth,
  requireRole(USER_ROLES.DRIVER),
  notBlockedByLoadCompany,
  placeBid
)
router.post(
  '/auctions/:loadId/claim',
  requireAuth,
  requireRole(USER_ROLES.DRIVER),
  notBlockedByLoadCompany,
  claimLoad
)

// Company viewing all their auctions
router.get(
  '/company/:companyId/auctions',
  requireAuth,
  requireRole(USER_ROLES.COMPANY),
  requireSelfParam('companyId'),
  getCompanyAuctions
)

export default router
