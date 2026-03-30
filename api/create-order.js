// api/create-order.js
// Vercel Serverless Function — Creates Razorpay order
// SECURITY: Key secret never leaves server. Amount computed server-side only.
// FIX: Added explicit JSON body parsing for Vercel serverless environment

import Razorpay from 'razorpay'

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
})

// Fee table (paise) — server-side only, never trusted from client
// ── PRODUCTION fees (uncomment when going live) ──
// const FEE_TABLE = {
//   General: 110000,   // ₹1,100
//   OBC:     100000,   // ₹1,000
//   SC:      100000,
//   ST:      100000,
//   EWS:     100000,
// }

// ── TEST fees ──
const FEE_TABLE = {
  General: 100,   // ₹1
  OBC:     100,
  SC:      100,
  ST:      100,
  EWS:     100,
}

// ── Parse JSON body manually (Vercel serverless mein req.body auto-parse nahi hota) ──
async function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    // If already parsed by Vercel (Next.js style)
    if (req.body && typeof req.body === 'object') {
      return resolve(req.body)
    }

    let raw = ''
    req.on('data', (chunk) => { raw += chunk.toString() })
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {})
      } catch {
        reject(new Error('Invalid JSON body'))
      }
    })
    req.on('error', reject)
  })
}

export const config = {
  api: { bodyParser: true },   // Vercel ko bolo JSON parse karo
}

export default async function handler(req, res) {
  // ── CORS Headers ──
  const allowedOrigin = process.env.ALLOWED_ORIGIN || '*'
  res.setHeader('Access-Control-Allow-Origin',  allowedOrigin)
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' })

  try {
    // ── Safe body parsing ──
    let body
    try {
      body = await parseJsonBody(req)
    } catch {
      return res.status(400).json({ error: 'Invalid request body' })
    }

    const { category } = body

    if (!category) {
      return res.status(400).json({ error: 'Category is required' })
    }

    const orderAmount = FEE_TABLE[category]
    if (!orderAmount) {
      return res.status(400).json({
        error: `Invalid category: "${category}". Must be one of: ${Object.keys(FEE_TABLE).join(', ')}`,
      })
    }

    const order = await razorpay.orders.create({
      amount:   orderAmount,
      currency: 'INR',
      receipt:  `rwp_${Date.now()}`,
      notes: {
        category,
        source: 'rural-welfare-program',
      },
    })

    console.log('Order created:', order.id, '| Amount:', order.amount, '| Category:', category)

    return res.status(200).json({
      orderId: order.id,
      amount:  order.amount,
    })

  } catch (error) {
    console.error('Razorpay order creation error:', error)
    return res.status(500).json({ error: 'Failed to create order. Please try again.' })
  }
}