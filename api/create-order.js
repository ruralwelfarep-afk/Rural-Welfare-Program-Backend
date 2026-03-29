// api/create-order.js
// Vercel Serverless Function — Creates Razorpay order
// SECURITY: Key secret never leaves server. Amount computed server-side only.

import Razorpay from 'razorpay'

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
})

// Fee table (paise) — defined server-side, never trusted from client
// const FEE_TABLE = {
//   General: 110000, // ₹1,100
//   OBC:     100000, // ₹1,000
//   SC:      100000,
//   ST:      100000,
//   EWS:     100000,
// }

const FEE_TABLE = {
  General: 100,  // ₹1
  OBC:     100,
  SC:      100,
  ST:      100,
  EWS:     100,
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { category } = req.body

    if (!category || !FEE_TABLE[category]) {
      return res.status(400).json({ error: 'Invalid category' })
    }

    const orderAmount = FEE_TABLE[category]

    const order = await razorpay.orders.create({
      amount: orderAmount,
      currency: 'INR',
      receipt: `rwp_${Date.now()}`,
    })

    return res.status(200).json({ orderId: order.id, amount: order.amount })
  } catch (error) {
    console.error('Razorpay order error:', error)
    return res.status(500).json({ error: 'Failed to create order' })
  }
}