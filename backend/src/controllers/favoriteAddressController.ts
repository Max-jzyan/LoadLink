import { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import * as favoriteAddressService from '../services/favoriteAddressService'

/**
 * GET /api/favorite-addresses/:companyId
 * Fetch the company's saved addresses, newest first.
 */
export const getFavoriteAddresses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const companyId = req.params.companyId as string
    const addresses = await favoriteAddressService.getFavoriteAddresses(companyId)
    res.status(StatusCodes.OK).json(addresses)
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/favorite-addresses/:companyId
 * Save a new favorite address.
 * Body: { address, lat, lng }
 */
export const addFavoriteAddress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const companyId = req.params.companyId as string
    const { address, lat, lng } = req.body
    const entry = await favoriteAddressService.addFavoriteAddress({ companyId, address, lat, lng })
    res.status(StatusCodes.CREATED).json(entry)
  } catch (err) {
    next(err)
  }
}

/**
 * DELETE /api/favorite-addresses/:companyId/:addressId
 * Remove a saved address.
 */
export const deleteFavoriteAddress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const companyId = req.params.companyId as string
    const addressId = req.params.addressId as string
    await favoriteAddressService.deleteFavoriteAddress(companyId, addressId)
    res.status(StatusCodes.NO_CONTENT).send()
  } catch (err) {
    next(err)
  }
}
