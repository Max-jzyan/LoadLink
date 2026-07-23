import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import mongoose from 'mongoose'
import dotenv from 'dotenv'

dotenv.config()
const app = express()
const PORT = process.env.PORT || 5000

app.use(helmet())
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// OpenRouter config status — unauthenticated, safe to expose (shows only boolean, not the key)
app.get('/api/ai/status', (_req, res) => {
  res.json({
    openrouterConfigured: (process.env.OPENROUTER_API_KEY ?? '').length > 0,
    model: process.env.OPENROUTER_MODEL ?? 'google/gemma-4-26b-a4b-it:free',
  })
})

import loadRouter from './routes/loadRoutes'
import auctionRouter from './routes/auctionRoutes'
import companyRouter from './routes/companyRoutes'
import driverRouter from './routes/driverRoutes'
import userRouter from './routes/userRoutes'
import truckRouter from './routes/truckRoutes'
import trailerRouter from './routes/trailerRoutes'
import reviewRouter from './routes/reviewRoutes'
import blocklistRouter from './routes/blocklistRoutes'
import favoriteAddressRouter from './routes/favoriteAddressRoutes'
import reportRouter from './routes/reportRoutes'
import uploadRouter from './routes/uploadRoutes'
import notificationRouter from './routes/notificationRoutes'
import messageRouter from './routes/messageRoutes'
import adminRouter from './routes/adminRoutes'
import { errorHandler } from './middleware/errorHandler'
import { startHeartbeat, startDocumentExpiryChecker } from './services/heartbeatService'

// Routes
app.use('/api', userRouter)
app.use('/api', loadRouter)
app.use('/api', auctionRouter)
app.use('/api', companyRouter)
app.use('/api', driverRouter)
app.use('/api', truckRouter)
app.use('/api', trailerRouter)
app.use('/api', reviewRouter)
app.use('/api', blocklistRouter)
app.use('/api', favoriteAddressRouter)
app.use('/api', reportRouter)
app.use('/api', uploadRouter)
app.use('/api', notificationRouter)
app.use('/api', messageRouter)
app.use('/api', adminRouter)

// Central error handler
app.use(errorHandler)

// MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://mongo:27017/loadlink'

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB')

    // Start the heartbeat engine once the DB is ready
    const stopHeartbeat = startHeartbeat()
    const stopExpiryChecker = startDocumentExpiryChecker()

    const server = app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`)
    })

    // Stop background jobs before closing gracefully
    const shutdown = () => {
      stopHeartbeat()
      stopExpiryChecker()
      server.close(() => process.exit(0))
    }
    process.once('SIGTERM', shutdown)
    process.once('SIGINT', shutdown)
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err)
    process.exit(1)
  })

export default app
