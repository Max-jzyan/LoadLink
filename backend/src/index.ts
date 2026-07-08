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

import loadRouter from './routes/loadRoutes'
import auctionRouter from './routes/auctionRoutes'
import companyRouter from './routes/companyRoutes'
import driverRouter from './routes/driverRoutes'
import userRouter from './routes/userRoutes'
import truckRouter from './routes/truckRoutes'
import reviewRouter from './routes/reviewRoutes'
import blocklistRouter from './routes/blocklistRoutes'
import reportRouter from './routes/reportRoutes'
import uploadRouter from './routes/uploadRoutes'
import { errorHandler } from './middleware/errorHandler'
import { startHeartbeat } from './services/heartbeatService'

// Routes
app.use('/api', userRouter)
app.use('/api', loadRouter)
app.use('/api', auctionRouter)
app.use('/api', companyRouter)
app.use('/api', driverRouter)
app.use('/api', truckRouter)
app.use('/api', reviewRouter)
app.use('/api', blocklistRouter)
app.use('/api', reportRouter)
app.use('/api', uploadRouter)

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

    const server = app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`)
    })

    // Stop heartbeat before closing gracefullu
    const shutdown = () => {
      stopHeartbeat()
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
