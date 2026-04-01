import express from 'express'
import healthHandler from './api/index.js'
import verifyHandler from './api/verify-payment.js' // 👈 tumhara main handler

const app = express()

app.use(express.json({ limit: '25mb' }))

// 🔥 Wake-up / health route
app.get('/api', (req, res) => {
  return healthHandler(req, res)
})

// 🔥 Main API route
app.post('/api/verify-payment', (req, res) => {
  return verifyHandler(req, res)
})

const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
})