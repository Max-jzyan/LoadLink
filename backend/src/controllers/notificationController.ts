import { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import * as notificationService from '../services/notificationService'

/**
 * GET /api/notifications
 * List the authenticated user's notifications (newest first, paginated).
 * Query params: page, limit, unreadOnly
 */
export const listNotifications = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!._id
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20
    const unreadOnly = req.query.unreadOnly === 'true'

    const result = await notificationService.listNotifications(userId, { page, limit, unreadOnly })
    res.status(StatusCodes.OK).json(result)
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/notifications/unread-count
 */
export const getUnreadCount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!._id
    const result = await notificationService.getUnreadCount(userId)
    res.status(StatusCodes.OK).json(result)
  } catch (err) {
    next(err)
  }
}

/**
 * PATCH /api/notifications/:notificationId/read
 */
export const markAsRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!._id
    const notificationId = req.params.notificationId as string
    const notification = await notificationService.markAsRead(notificationId, userId)
    res.status(StatusCodes.OK).json(notification)
  } catch (err) {
    next(err)
  }
}

/**
 * PATCH /api/notifications/read-all
 */
export const markAllAsRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!._id
    const result = await notificationService.markAllAsRead(userId)
    res.status(StatusCodes.OK).json(result)
  } catch (err) {
    next(err)
  }
}

/**
 * DELETE /api/notifications/:notificationId
 */
export const deleteNotification = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!._id
    const notificationId = req.params.notificationId as string
    await notificationService.deleteNotification(notificationId, userId)
    res.status(StatusCodes.NO_CONTENT).send()
  } catch (err) {
    next(err)
  }
}
