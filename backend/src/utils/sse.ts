import { Response } from 'express'
import { SSE_PING_INTERVAL_MS } from '../constants/sse'

/**
 * Server-Sent Events (SSE) helpers.
 *
 * SSE keeps a single HTTP response open and streams text chunks to the client
 * over time. Each message is written as `data: <json>\n\n`. These helpers hold
 * the shared boilerplate so every SSE endpoint stays consistent.
 */

export const initSSE = (res: Response): void => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no') // disable proxy buffering in nginx
  res.flushHeaders()
}

export const sendSSE = (res: Response, data: unknown): void => {
  res.write(`data: ${JSON.stringify(data)}\n\n`)
}

/**
 * Start sending periodic keep-alive pings (SSE comment lines). Returns the
 * timer so the caller can clear it when the client disconnects.
 */
export const startSSEKeepAlive = (res: Response): NodeJS.Timeout =>
  setInterval(() => {
    res.write(': ping\n\n')
  }, SSE_PING_INTERVAL_MS)
