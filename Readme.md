# 🌿 Rural Welfare Program — Backend

Vercel Serverless Functions using **Razorpay + Google Drive + Resend**.

---

## 📁 Project Structure

```
backend/
├── api/
│   ├── utils/
│   │   └── generatePDF.js       ← PDF generation (DO NOT TOUCH)
│   ├── create-order.js          ← Razorpay order creation
│   ├── verify-payment.js        ← Payment verification + PDF + Drive + Email
│   └── index.js                 ← Health check
├── public/
│   └── logo.webp                ← Logo for PDF header
├── .env                         ← Environment variables (never commit)
├── vercel.json                  ← Vercel config (timeouts, memory)
└── package.json
```

---

## ⚙️ Environment Variables (`.env`)

```env
# Razorpay
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx

# Google Service Account
GOOGLE_PROJECT_ID=your-project-id
GOOGLE_PRIVATE_KEY_ID=xxxxxxxxxxxx
GOOGLE_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----\n"
GOOGLE_CLIENT_EMAIL=your-sa@your-project.iam.gserviceaccount.com
GOOGLE_CLIENT_ID=xxxxxxxxxxxx
GOOGLE_DRIVE_FOLDER_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Resend
RESEND_API_KEY=re_xxxxxxxxxxxx
FROM_EMAIL=noreply@yourdomain.com
ADMIN_EMAIL=admin@yourdomain.com

# CORS — frontend ka URL
ALLOWED_ORIGIN=https://your-frontend.vercel.app
```

---

## 🚀 Deploy

```bash
# Install
npm install

# Local dev
vercel dev

# Deploy to production
vercel --prod
```

---

## 🔄 Payment Flow

```
Frontend                          Backend
─────────                         ───────
1. User fills form
2. Click "Pay & Submit"
   → POST /api/create-order  ──►  Verify category
   (category)                     Create Razorpay order
                             ◄──  Return { orderId, amount }
3. Razorpay modal opens
4. User pays
5. handler() called
   → POST /api/verify-payment ──► Verify HMAC signature
   (FormData + files)             Validate files
                                  Generate PDF (pdf-lib)
                                  Upload to Google Drive
                                  Send emails (Resend)
                             ◄──  Return { success, pdfBase64,
                                           registrationNo, driveLink }
6. Navigate to /success
```

---

## 🐛 Common Issues & Fixes

### Issue: `category is required` — 400 error on create-order
**Cause:** Vercel mein `req.body` auto-parse nahi hota without `bodyParser: true` config.  
**Fix:** `create-order.js` mein `export const config = { api: { bodyParser: true } }` add kiya hai. ✅

### Issue: `registrationNo` missing in success response
**Cause:** `registrationNo` Drive upload ke baad generate ho raha tha, agar Drive fail hota toh skip ho jaata tha.  
**Fix:** Ab `registrationNo` handler ke **shuru mein** generate hota hai (Step 1), before any async operation. ✅

### Issue: `504 Gateway Timeout`
**Cause:** Default Vercel timeout 10s hai. PDF + Drive + Email = 30-60s.  
**Fix:** `vercel.json` mein `"maxDuration": 60` set karo. ✅

### Issue: Drive ya email fail hone pe poori application fail ho jaati thi
**Cause:** Drive/email errors `try-catch` ke bahar the.  
**Fix:** Ab Drive upload aur emails **non-blocking** hain — fail hone pe sirf log hota hai, PDF aur `registrationNo` wapas milta hai. ✅

### Issue: `nationality` ReferenceError → 500 crash
**Cause:** `nationality` field destructure nahi thi (purana code).  
**Fix:** Ab properly destructure hoti hai with `'Indian'` fallback. ✅

---

## 🔒 Security Notes

- **Signature verification** — Razorpay HMAC-SHA256 checked before ANY processing
- **Amount server-side** — Fee table only on server, never trusted from client
- **File validation** — MIME type + size checked before reading
- **Aadhar masking** — Applicant email mein sirf last 4 digits, admin email mein full
- **ALLOWED_ORIGIN** — CORS restricted to your frontend URL in production

---

## 📦 Dependencies

| Package | Use |
|---|---|
| `razorpay` | Order creation |
| `pdf-lib` | PDF generation |
| `googleapis` | Google Drive upload |
| `resend` | Email delivery |
| `formidable` | Multipart form parsing |
| `sharp` | Logo WebP → PNG conversion for PDF |

---

## 🧪 Testing

1. Set `FEE_TABLE` values to `100` (₹1) in `create-order.js`
2. Use Razorpay test cards: `4111 1111 1111 1111`, any future expiry, any CVV
3. Check Vercel function logs: `vercel logs --follow`
4. Check `[verify-payment]` console logs for step-by-step debug info

---

*generatePDF.js — Do not modify layout/positioning code.*