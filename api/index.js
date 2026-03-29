// api/index.js
export default function handler(req, res) {
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