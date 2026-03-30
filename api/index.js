// api/index.js  — SIRF YEH CHANGE KARO
export default function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(200).end()

  res.status(200).json({
    status: 'ok',
    message: '🟢 Rural Welfare Program Backend is running',
    version: '1.0.0',
    routes: [
      'POST /api/create-order',
      'POST /api/verify-payment',
    ],
  })
}