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
import driverRouter from './routes/driverRoutes'
import { errorHandler } from './middleware/errorHandler'

// Routes
app.use('/api', loadRouter)
app.use('/api', auctionRouter)
app.use('/api', driverRouter)

// Central error handler
app.use(errorHandler)

// MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://mongo:27017/loadlink'

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB')
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`)
    })
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err)
    process.exit(1)
  })

export default app
