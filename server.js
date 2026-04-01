import express from 'express'
import cors from 'cors'
import healthHandler from './api/index.js'
import verifyHandler from './api/verify-payment.js'

const app = express()

// ✅ CORS FIX
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://ruralwelfareprogram.com'
  ],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}))

app.use(express.json({ limit: '25mb' }))

// ✅ Routes
app.get('/api', (req, res) => {
  return healthHandler(req, res)
})

app.post('/api/verify-payment', (req, res) => {
  return verifyHandler(req, res)
})

const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
})