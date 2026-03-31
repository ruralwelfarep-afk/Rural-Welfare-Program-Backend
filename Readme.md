# ⚙️ Rural Welfare Program — Backend

Vercel Serverless Functions. PDF generation, email, aur Apps Script coordination yahan se hoti hai.

---

## 📁 Project Structure

```
api/
├── index.js                     ← Health check endpoint
├── verify-payment.js            ← Main handler (PDF + email + Apps Script)
└── utils/
    └── generatePDF.js           ← pdf-lib se application PDF banata hai
Code.gs                          ← Google Apps Script (alag deploy hota hai)
.env                             ← Environment variables (neeche dekho)
```

---

## ⚙️ Environment Variables — `.env`

```dotenv
APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
RESEND_API_KEY=re_DCeGjrEe_xxxxxxxxxxxx
FROM_EMAIL=ruralwelfarep@gmail.com
ADMIN_EMAIL=ruralwelfarep@gmail.com
ALLOWED_ORIGIN=http://localhost:5173
```

| Variable | Kya hai | Kahan se milega |
|---|---|---|
| `APPS_SCRIPT_URL` | Google Apps Script Web App URL | `Code.gs` deploy karne ke baad |
| `RESEND_API_KEY` | Resend email service key | resend.com → API Keys |
| `FROM_EMAIL` | Email sender address | Resend mein domain verify karo |
| `ADMIN_EMAIL` | Admin ko notification yahan aayegi | Apna email |
| `ALLOWED_ORIGIN` | Frontend URL (CORS ke liye) | Frontend ka Vercel URL |

> Production mein `ALLOWED_ORIGIN=https://your-frontend.vercel.app` karo

---

## 🔄 verify-payment.js — Kaise kaam karta hai

### Frontend se aata hai (POST `/api/verify-payment`):
```json
{
  "registrationNo": "1234567890",
  "paymentId": "PAY_TXNXXXXX",
  "formData": {
    "name": "Ram Kumar",
    "email": "ram@gmail.com",
    "aadhar": "123456789012",
    "postTitle": "Anganwadi Worker",
    ...
  },
  "paymentInfo": {
    "paymentMethod": "UPI",
    "utrNumber": "T2345678901",
    "senderName": "Ram Kumar",
    "senderUpiId": "ram@upi"
  },
  "uploadedFiles": {
    "photo":     { "base64": "...", "mimetype": "image/jpeg" },
    "signature": { "base64": "...", "mimetype": "image/jpeg" },
    "aadharDoc": { "base64": "...", "mimetype": "application/pdf" },
    ...
  }
}
```

### Step by step kya hota hai:

```
1. Validation
   └─ name, email, registrationNo, utrNumber check karo
         ↓
2. base64ToFileObj()
   └─ Har uploaded file ka base64 → Buffer convert karo
      (generatePDF ke liye Buffer chahiye)
         ↓
3. generateApplicationPDF()    [utils/generatePDF.js]
   └─ pdf-lib se ek page PDF banao
   └─ Photo + Signature embed karo
   └─ Personal details, Education table, Payment details
   └─ Page 2+: Uploaded documents attach karo
   └─ Returns: Uint8Array (raw PDF bytes)
         ↓
4. submitToAppsScript()
   POST → APPS_SCRIPT_URL
   └─ Saara form data + pdfBase64 bhejo
   └─ Apps Script karta hai:
      ├─ Google Sheet mein row add karo
      ├─ PDF Drive pe upload karo
      └─ Drive link wapas do
         ↓
5. sendEmails()    [Resend]
   └─ Applicant ko: PDF attached + registration details
   └─ Admin ko: Same PDF + real Aadhar number
         ↓
6. Response to Frontend
   └─ { pdfBase64, driveLink, registrationNo, filename }
```

---

## 📄 generatePDF.js — Kaise kaam karta hai

```
generateApplicationPDF(formData, paymentId, uploadedFiles)
      │
      ├─ Page 1:
      │   ├─ Header (green banner — Rural Welfare Program)
      │   ├─ Post name + Registration No.
      │   ├─ Personal Details table (name, dob, aadhar, etc.)
      │   ├─ Education table (10th, 12th)
      │   ├─ Payment Details (method, UTR, status)
      │   ├─ Uploaded Documents checklist (YES/NO)
      │   └─ Photo box + Signature box + Date box
      │
      └─ Page 2, 3, 4...:
          └─ Har uploaded document ek alag page pe
             (Aadhar, 10th, 12th, additional)
```

---

## 🗂️ Code.gs — Google Apps Script

> Yeh Vercel pe deploy **nahi** hota — alag Google Apps Script project mein jaata hai

```
Kya karta hai:
├─ doGet:  UTR duplicate check (frontend se call hota hai)
├─ doPost: Form data receive karo
│   ├─ UTR duplicate check (double safety)
│   ├─ Google Sheet mein row add karo (Applications sheet)
│   ├─ UTR_Log sheet mein UTR save karo
│   └─ pdfBase64 → DriveApp se PDF upload karo
│       └─ Drive link wapas bhejo backend ko

2 sheets automatically banata hai:
├─ Applications  ← Saari applications yahan
└─ UTR_Log       ← Duplicate detection ke liye
```

### Code.gs mein sirf 2 cheezein daalni hain:
```js
const SHEET_ID        = 'Google Sheet ka ID'
const DRIVE_FOLDER_ID = 'Drive Folder ka ID'
```

---

## 🚀 Deploy Steps

### Backend (Vercel):
```bash
npm install
vercel dev        # local test
vercel --prod     # deploy
```
Vercel Dashboard → Settings → Environment Variables mein saari values daalo.

### Apps Script (Code.gs):
1. [script.google.com](https://script.google.com) → New Project
2. Poora `Code.gs` paste karo
3. `SHEET_ID` aur `DRIVE_FOLDER_ID` daalo
4. Pehli baar: `setupSheets` function run karo (sheets + dropdown banata hai)
5. Deploy → New Deployment → Web App
   - Execute as: **Me**
   - Who has access: **Anyone**
6. URL copy karo → backend `.env` mein `APPS_SCRIPT_URL` mein daalo

---

## 📦 Dependencies

```json
{
  "resend": "email bhejne ke liye",
  "pdf-lib": "PDF generate karne ke liye",
  "sharp": "logo image process karne ke liye (optional)"
}
```

> `googleapis` ab nahi chahiye — Drive ka kaam Apps Script karta hai

---

## 🔗 Complete Flow (ek nazar mein)

```
Frontend (React)
    │
    │ POST /api/verify-payment
    ▼
verify-payment.js
    │
    ├──► generatePDF.js ──► PDF bytes
    │
    ├──► Code.gs (Apps Script)
    │        ├──► Google Sheet mein data
    │        └──► Google Drive mein PDF
    │                    └──► Drive link wapas
    │
    ├──► Resend
    │        ├──► Applicant ko email (PDF attached)
    │        └──► Admin ko email (PDF attached)
    │
    └──► Frontend ko response
             ├── pdfBase64 (download ke liye)
             ├── driveLink
             └── registrationNo
```

---

## ❗ Common Issues

| Problem | Solution |
|---|---|
| CORS error | `ALLOWED_ORIGIN` mein frontend URL sahi daalo |
| Email nahi aa raha | Resend mein domain verify karo, `FROM_EMAIL` check karo |
| Sheet mein data nahi | `APPS_SCRIPT_URL` check karo, Apps Script re-deploy karo |
| Drive mein PDF nahi | `Code.gs` mein `DRIVE_FOLDER_ID` check karo |
| PDF generation fail | `sharp` install check karo, logo path check karo |
| 413 error (body too large) | `sizeLimit: '25mb'` verify-payment.js config mein hai |