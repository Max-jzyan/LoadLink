import { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import * as blocklistService from '../services/blocklistService'

/**
 * GET /api/blocklist/:userId
 * Fetch the user's active blocklist entries (target name populated).
 */
export const getBlocklist = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.params.userId as string
    const entries = await blocklistService.getBlocklistForUser(userId)
    res.status(StatusCodes.OK).json(entries)
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/blocklist/:userId
 * Block a registered user by name.
 * Body: { targetName, targetType: 'driver' | 'company', reason? }
 */
export const blockUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.params.userId as string
    const { targetName, targetType, reason } = req.body
    const entry = await blocklistService.blockUserByName({ userId, targetName, targetType, reason })
    res.status(StatusCodes.CREATED).json(entry)
  } catch (err) {
    next(err)
  }
}

/**
 * DELETE /api/blocklist/:userId/:targetId
 * Unblock a target (soft-deactivates the entry so admins retain history).
 */
export const unblockUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.params.userId as string
    const targetId = req.params.targetId as string
    await blocklistService.unblockUser(userId, targetId)
    res.status(StatusCodes.NO_CONTENT).send()
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/blocklist/:userId/known-users
 * Returns users the current user has previously interacted with via bidding
 * or completed/assigned loads — only surfaced for the blocklist dropdown,
 * not for general directory browsing. Already-blocked users are excluded.
 */
export const getKnownUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.params.userId as string
    const knownUsers = await blocklistService.getKnownUsersForBlocklist(userId)
    res.status(StatusCodes.OK).json(knownUsers)
  } catch (err) {
    next(err)
  }
}
