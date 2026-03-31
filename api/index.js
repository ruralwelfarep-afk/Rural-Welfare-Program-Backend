// api/index.js
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(200).end()

  res.status(200).json({
    status:  'ok',
    message: '🟢 Rural Welfare Program Backend is running',
    version: '2.0.0',
    routes: [
      'POST /api/verify-payment',
    ],
  })
}