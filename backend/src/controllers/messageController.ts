import { Request, Response, NextFunction } from 'express'
import { StatusCodes } from 'http-status-codes'
import * as messageService from '../services/messageService'

/**
 * GET /api/loads/:loadId/messages
 * Full message thread for a load (participants only): messages in
 * chronological order plus counterparty info for the chat header.
 */
export const getThread = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const loadId = req.params.loadId as string
    const userId = req.user!._id
    const thread = await messageService.getThread(loadId, userId)
    res.status(StatusCodes.OK).json(thread)
  } catch (err) {
    next(err)
  }
}

/**
 * POST /api/loads/:loadId/messages
 * Send a message on a load thread. The recipient is derived server-side as
 * the other participant (company <-> assigned driver).
 */
export const sendMessage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const loadId = req.params.loadId as string
    const userId = req.user!._id
    const message = await messageService.sendMessage(loadId, userId, req.body?.body)
    res.status(StatusCodes.CREATED).json(message)
  } catch (err) {
    next(err)
  }
}

/**
 * PATCH /api/loads/:loadId/messages/read
 * Mark all messages addressed to the authenticated user in this thread as read.
 */
export const markThreadRead = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const loadId = req.params.loadId as string
    const userId = req.user!._id
    const result = await messageService.markThreadRead(loadId, userId)
    res.status(StatusCodes.OK).json(result)
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/messages/threads
 * Conversation archive for the authenticated user: one summary per load
 * thread (route, status, counterparty, last message, unread count),
 * newest activity first.
 */
export const listThreads = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!._id
    const threads = await messageService.listThreads(userId)
    res.status(StatusCodes.OK).json(threads)
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/messages/unread-counts
 * Unread message totals for the authenticated user: overall + per load.
 */
export const getUnreadCounts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!._id
    const result = await messageService.getUnreadCounts(userId)
    res.status(StatusCodes.OK).json(result)
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/loads/:loadId/messages/stream
 * Per-load SSE channel: pushes each new thread message to connected
 * participants. Auth via requireAuthSSE (?access_token=).
 */
export const streamThread = async (req: Request, res: Response, next: NextFunction) => {
  const loadId = req.params.loadId as string
  const userId = req.user!._id

  try {
    // Reject non-participants before holding a stream open
    await messageService.getThreadContext(loadId, userId)
  } catch (err) {
    return next(err)
  }

  const { initSSE, sendSSE, startSSEKeepAlive } = await import('../utils/sse')
  const { onThreadMessage } = await import('../events/messageEvents')

  initSSE(res)
  const keepAlive = startSSEKeepAlive(res)
  const unsubscribe = onThreadMessage(loadId, (payload) => sendSSE(res, payload))

  req.on('close', () => {
    clearInterval(keepAlive)
    unsubscribe()
    res.end()
  })
}
