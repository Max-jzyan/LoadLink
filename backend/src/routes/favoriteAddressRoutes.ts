import { Router } from 'express'
import {
  getFavoriteAddresses,
  addFavoriteAddress,
  deleteFavoriteAddress,
} from '../controllers/favoriteAddressController'
import { requireAuth } from '../middleware/requireAuth'
import { requireRole, requireSelfParam } from '../middleware/authorize'
import { USER_ROLES } from '../models/enums'

const router = Router()

// A company manages only its own saved addresses.
router.get(
  '/favorite-addresses/:companyId',
  requireAuth,
  requireRole(USER_ROLES.COMPANY),
  requireSelfParam('companyId'),
  getFavoriteAddresses
)
router.post(
  '/favorite-addresses/:companyId',
  requireAuth,
  requireRole(USER_ROLES.COMPANY),
  requireSelfParam('companyId'),
  addFavoriteAddress
)
router.delete(
  '/favorite-addresses/:companyId/:addressId',
  requireAuth,
  requireRole(USER_ROLES.COMPANY),
  requireSelfParam('companyId'),
  deleteFavoriteAddress
)

export default router
