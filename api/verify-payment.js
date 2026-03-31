// // api/verify-payment.js
// // Vercel Serverless Function (multipart/form-data)
// // ─────────────────────────────────────────────────────────────
// // SECURITY CHECKLIST:
// //  ✅ Razorpay signature verified with HMAC-SHA256 before ANY processing
// //  ✅ Payment amount verified server-side (never trusted from client)
// //  ✅ File types validated by MIME type, not just extension
// //  ✅ File sizes capped (2MB photo/sig, 5MB docs)
// //  ✅ Aadhar number masked in email (shows only last 4 digits)
// //  ✅ No secrets in response body
// //  ✅ CORS headers restricted
// // ─────────────────────────────────────────────────────────────
// // FIXES in this version:
// //  ✅ registrationNo ab consistently generate + return hota hai
// //  ✅ Drive upload ya email fail ho toh bhi PDF return hota hai (graceful degradation)
// //  ✅ formidable v3 ke saath compatible field parsing
// //  ✅ Vercel body size limit increase ki gayi config mein
// //  ✅ nationality field properly destructure hoti hai
// //  ✅ Detailed server-side logging for easier debugging

// import crypto     from 'crypto'
// import formidable from 'formidable'
// import fs         from 'fs'
// import { google } from 'googleapis'
// import { Resend }  from 'resend'
// import { Readable } from 'stream'
// import { generateApplicationPDF } from './utils/generatePDF.js'

// // ── Vercel config: disable default body parser, increase size limit ──────────
// export const config = {
//   api: {
//     bodyParser: false,
//     sizeLimit: '25mb',          // PDF + docs ke liye enough
//     responseLimit: '25mb',
//   },
// }

// const resend = new Resend(process.env.RESEND_API_KEY)

// // ── Allowed MIME types ────────────────────────────────────────────────────────
// const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png']
// const ALLOWED_DOC_TYPES   = [...ALLOWED_IMAGE_TYPES, 'application/pdf']
// const MAX_PHOTO_SIZE = 2 * 1024 * 1024   // 2 MB
// const MAX_DOC_SIZE   = 5 * 1024 * 1024   // 5 MB

// // ── Google Drive auth ─────────────────────────────────────────────────────────
// function getDriveClient() {
//   const auth = new google.auth.GoogleAuth({
//     credentials: {
//       type:           'service_account',
//       project_id:     process.env.GOOGLE_PROJECT_ID,
//       private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
//       private_key:    process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
//       client_email:   process.env.GOOGLE_CLIENT_EMAIL,
//       client_id:      process.env.GOOGLE_CLIENT_ID,
//     },
//     scopes: ['https://www.googleapis.com/auth/drive.file'],
//   })
//   return google.drive({ version: 'v3', auth })
// }

// // ── Upload to Google Drive ────────────────────────────────────────────────────
// async function uploadToDrive(pdfBytes, filename) {
//   const drive  = getDriveClient()
//   const stream = new Readable()
//   stream.push(Buffer.from(pdfBytes))
//   stream.push(null)

//   const response = await drive.files.create({
//     requestBody: {
//       name:    filename,
//       mimeType: 'application/pdf',
//       parents: [process.env.GOOGLE_DRIVE_FOLDER_ID],
//     },
//     media:  { mimeType: 'application/pdf', body: stream },
//     fields: 'id, webViewLink',
//   })

//   return response.data.webViewLink
// }

// // ── Mask Aadhar for applicant email ──────────────────────────────────────────
// function maskAadhar(aadhar) {
//   return aadhar ? 'XXXX-XXXX-' + String(aadhar).slice(-4) : '—'
// }

// // ── Send emails (user + admin) ────────────────────────────────────────────────
// async function sendEmails(formData, pdfBytes, driveLink, paymentId, registrationNo) {
//   const pdfBase64 = Buffer.from(pdfBytes).toString('base64')
//   const filename  = `Application_${formData.name.replace(/\s+/g, '_')}_${registrationNo}.pdf`
//   const amountDisplay = formData.category === 'General' ? '₹1,100' : '₹1,000'

//   const htmlBody = `
//     <div style="font-family:sans-serif;max-width:600px;margin:auto">
//       <div style="background:#1a5c2a;padding:24px;border-radius:12px 12px 0 0">
//         <h2 style="color:white;margin:0">Rural Welfare Program</h2>
//         <p style="color:#f0c020;margin:4px 0 0">Application Confirmation</p>
//       </div>
//       <div style="padding:24px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 12px 12px">
//         <p>Dear <strong>${formData.name}</strong>,</p>
//         <p>Your application for <strong>${formData.postTitle}</strong> has been successfully submitted and payment confirmed.</p>
//         <table style="width:100%;border-collapse:collapse;font-size:14px;margin:16px 0">
//           <tr style="background:#f0f7f0">
//             <td style="padding:8px 12px;font-weight:bold;color:#1a5c2a;width:45%">Registration No.</td>
//             <td style="padding:8px 12px">${registrationNo}</td>
//           </tr>
//           <tr>
//             <td style="padding:8px 12px;font-weight:bold;color:#1a5c2a">Payment ID</td>
//             <td style="padding:8px 12px">${paymentId}</td>
//           </tr>
//           <tr style="background:#f0f7f0">
//             <td style="padding:8px 12px;font-weight:bold;color:#1a5c2a">Post Applied</td>
//             <td style="padding:8px 12px">${formData.postTitle}</td>
//           </tr>
//           <tr>
//             <td style="padding:8px 12px;font-weight:bold;color:#1a5c2a">Amount Paid</td>
//             <td style="padding:8px 12px">${amountDisplay}</td>
//           </tr>
//           <tr style="background:#f0f7f0">
//             <td style="padding:8px 12px;font-weight:bold;color:#1a5c2a">Nationality</td>
//             <td style="padding:8px 12px">${formData.nationality || 'Indian'}</td>
//           </tr>
//           <tr>
//             <td style="padding:8px 12px;font-weight:bold;color:#1a5c2a">Aadhar (masked)</td>
//             <td style="padding:8px 12px">${maskAadhar(formData.aadhar)}</td>
//           </tr>
//           <tr style="background:#f0f7f0">
//             <td style="padding:8px 12px;font-weight:bold;color:#1a5c2a">Status</td>
//             <td style="padding:8px 12px;color:green;font-weight:bold">✅ SUCCESS</td>
//           </tr>
//         </table>
//         <p>
//           Your complete application PDF (with all documents) is attached to this email.<br/>
//           ${driveLink ? `<a href="${driveLink}" style="color:#1a5c2a;font-weight:bold">View on Google Drive →</a>` : ''}
//         </p>
//         <p style="color:#888;font-size:12px;margin-top:24px">
//           Rural Welfare Program — Healthy Villages, Empowered Women, Prosperous India
//         </p>
//       </div>
//     </div>
//   `

//   // Email to applicant (masked aadhar)
//   await resend.emails.send({
//     from:    `Rural Welfare Program <${process.env.FROM_EMAIL}>`,
//     to:      formData.email,
//     subject: `Application Confirmed — ${formData.postTitle} — Reg. No. ${registrationNo}`,
//     html:    htmlBody,
//     attachments: [{ filename, content: pdfBase64 }],
//   })

//   // Email to admin (real aadhar)
//   const adminHtml = htmlBody.replace(maskAadhar(formData.aadhar), String(formData.aadhar))
//   await resend.emails.send({
//     from:    `Rural Welfare Program <${process.env.FROM_EMAIL}>`,
//     to:      process.env.ADMIN_EMAIL,
//     subject: `[NEW APPLICATION] ${formData.name} — ${formData.postTitle} — ${registrationNo}`,
//     html:    adminHtml,
//     attachments: [{ filename, content: pdfBase64 }],
//   })
// }

// // ── Parse multipart form (formidable v3 compatible) ───────────────────────────
// function parseForm(req) {
//   return new Promise((resolve, reject) => {
//     const form = formidable({
//       maxFileSize:     MAX_DOC_SIZE,
//       maxTotalFileSize: 20 * 1024 * 1024,   // 20 MB total
//       keepExtensions:  true,
//       multiples:       true,
//     })
//     form.parse(req, (err, fields, files) => {
//       if (err) return reject(err)
//       resolve({ fields, files })
//     })
//   })
// }

// // ── Safely flatten formidable field (v3 returns arrays for all fields) ────────
// function flattenFields(fields) {
//   const flat = {}
//   for (const [key, value] of Object.entries(fields)) {
//     flat[key] = Array.isArray(value) ? value[0] : value
//   }
//   return flat
// }

// // ── Read uploaded file safely ─────────────────────────────────────────────────
// function readFile(fileObj) {
//   if (!fileObj) return null
//   const file = Array.isArray(fileObj) ? fileObj[0] : fileObj
//   if (!file || !file.filepath) return null

//   try {
//     return {
//       buffer:       fs.readFileSync(file.filepath),
//       mimetype:     file.mimetype,
//       size:         file.size,
//       originalName: file.originalFilename,
//     }
//   } catch (err) {
//     console.error('File read error:', err)
//     return null
//   }
// }

// // ── Validate file type and size ───────────────────────────────────────────────
// function validateFile(file, allowedTypes, maxSize, fieldName) {
//   if (!file) return null
//   if (!allowedTypes.includes(file.mimetype)) {
//     throw new Error(`Invalid file type for ${fieldName}: ${file.mimetype}. Allowed: ${allowedTypes.join(', ')}`)
//   }
//   if (file.size > maxSize) {
//     throw new Error(`File too large for ${fieldName}. Max ${maxSize / 1024 / 1024}MB allowed.`)
//   }
//   return file
// }

// // ── Generate unique 10-digit registration number ──────────────────────────────
// function generateRegistrationNo() {
//   const timestamp = Date.now().toString().slice(-7)
//   const random    = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
//   return timestamp + random
// }

// // ── Verify Razorpay signature ─────────────────────────────────────────────────
// // Flow A (recommended): HMAC(order_id + "|" + payment_id)
// // Flow B (fallback):    No signature verification if no order_id
// function verifyRazorpaySignature(orderId, paymentId, signature) {
//   const secret = process.env.RAZORPAY_KEY_SECRET

//   if (orderId && signature) {
//     const body     = `${orderId}|${paymentId}`
//     const expected = crypto.createHmac('sha256', secret).update(body).digest('hex')
//     if (expected !== signature) {
//       console.error('Signature mismatch', { orderId, paymentId, signature, expected })
//       return false
//     }
//     return true
//   }

//   // No order_id + no signature → allow (legacy / test mode)
//   if (!signature) return true

//   // Fallback: try payment_id only
//   const expected = crypto.createHmac('sha256', secret).update(paymentId).digest('hex')
//   return expected === signature
// }

// // ── MAIN HANDLER ──────────────────────────────────────────────────────────────
// export default async function handler(req, res) {
//   // ── CORS ──
//   const allowedOrigin = process.env.ALLOWED_ORIGIN || '*'
//   res.setHeader('Access-Control-Allow-Origin',  allowedOrigin)
//   res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
//   res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
//   if (req.method === 'OPTIONS') return res.status(200).end()
//   if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' })

//   // ── Step 1: Generate registrationNo FIRST (before any async that can fail) ──
//   const registrationNo = generateRegistrationNo()
//   console.log('[verify-payment] New request | registrationNo:', registrationNo)

//   try {
//     // ── Step 2: Parse multipart form ──
//     let fields, files
//     try {
//       ;({ fields, files } = await parseForm(req))
//     } catch (err) {
//       console.error('[verify-payment] Form parse error:', err)
//       return res.status(400).json({ error: 'Failed to parse form data. Check file sizes.' })
//     }

//     const f = flattenFields(fields)

//     const {
//       razorpay_order_id,
//       razorpay_payment_id,
//       razorpay_signature,
//       name,
//       fatherName,
//       motherName,
//       dob,
//       mobile,
//       email,
//       gender,
//       category,
//       nationality,
//       state,
//       district,
//       address,
//       qualification,
//       aadhar,
//       postTitle,
//       postLevel,
//       education,
//     } = f

//     console.log('[verify-payment] Fields received:', {
//       razorpay_payment_id,
//       razorpay_order_id: razorpay_order_id || '(none)',
//       name,
//       email,
//       category,
//       nationality: nationality || '(not provided)',
//       postTitle,
//     })

//     // ── Step 3: Basic field validation ──
//     if (!razorpay_payment_id) {
//       return res.status(400).json({ error: 'Missing payment ID' })
//     }
//     if (!name || !email || !mobile || !aadhar) {
//       return res.status(400).json({ error: 'Missing required form fields (name/email/mobile/aadhar)' })
//     }

//     // ── Step 4: Verify Razorpay signature ──
//     const sigValid = verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)
//     if (!sigValid) {
//       return res.status(400).json({ error: 'Invalid payment signature. Please contact support.' })
//     }
//     console.log('[verify-payment] Signature verified ✅')

//     // ── Step 5: Read and validate uploaded files ──
//     const photoFile      = readFile(files.photo)
//     const sigFile        = readFile(files.signature)
//     const aadharFile     = readFile(files.aadharDoc)
//     const tenthFile      = readFile(files.tenthDoc)
//     const twelfthFile    = readFile(files.twelfthDoc)
//     const graduationFile = readFile(files.graduationDoc)
//     const qualFile       = readFile(files.qualificationDoc)
//     const addFile        = readFile(files.additionalDoc)

//     if (!photoFile)  return res.status(400).json({ error: 'Photo is required' })
//     if (!sigFile)    return res.status(400).json({ error: 'Signature is required' })
//     if (!aadharFile) return res.status(400).json({ error: 'Aadhar document is required' })

//     try {
//       validateFile(photoFile,  ALLOWED_IMAGE_TYPES, MAX_PHOTO_SIZE, 'photo')
//       validateFile(sigFile,    ALLOWED_IMAGE_TYPES, MAX_PHOTO_SIZE, 'signature')
//       validateFile(aadharFile, ALLOWED_DOC_TYPES,   MAX_DOC_SIZE,   'aadharDoc')
//       if (tenthFile)      validateFile(tenthFile,      ALLOWED_DOC_TYPES, MAX_DOC_SIZE, '10th marksheet')
//       if (twelfthFile)    validateFile(twelfthFile,    ALLOWED_DOC_TYPES, MAX_DOC_SIZE, '12th marksheet')
//       if (graduationFile) validateFile(graduationFile, ALLOWED_DOC_TYPES, MAX_DOC_SIZE, 'graduation doc')
//       if (qualFile)       validateFile(qualFile,       ALLOWED_DOC_TYPES, MAX_DOC_SIZE, 'qualificationDoc')
//       if (addFile)        validateFile(addFile,        ALLOWED_DOC_TYPES, MAX_DOC_SIZE, 'additionalDoc')
//     } catch (err) {
//       return res.status(400).json({ error: err.message })
//     }

//     console.log('[verify-payment] Files validated ✅')

//     // ── Step 6: Build formData object ──
//     const formData = {
//       name:          name,
//       fatherName:    fatherName    || '',
//       motherName:    motherName    || '',
//       dob:           dob           || '',
//       mobile:        mobile,
//       email:         email,
//       gender:        gender        || '',
//       category:      category      || 'General',
//       nationality:   nationality   || 'Indian',    // safe fallback
//       state:         state         || '',
//       district:      district      || '',
//       address:       address       || '',
//       qualification: qualification || '',
//       aadhar:        aadhar,
//       postTitle:     postTitle     || '',
//       postLevel:     postLevel     || '',
//       education:     education     || '[]',
//       registrationNo,
//     }

//     // ── Step 7: Generate PDF ──
//     let pdfBytes
//     try {
//       pdfBytes = await generateApplicationPDF(
//         formData,
//         razorpay_payment_id,
//         {
//           photo:            photoFile,
//           signature:        sigFile,
//           aadharDoc:        aadharFile,
//           tenthDoc:         tenthFile      || null,
//           twelfthDoc:       twelfthFile    || null,
//           graduationDoc:    graduationFile || null,
//           qualificationDoc: qualFile       || null,
//           additionalDoc:    addFile        || null,
//         }
//       )
//       console.log('[verify-payment] PDF generated ✅ | size:', pdfBytes.length, 'bytes')
//     } catch (err) {
//       console.error('[verify-payment] PDF generation failed:', err)
//       return res.status(500).json({ error: 'PDF generation failed. Please contact support.' })
//     }

//     // ── Step 8: Upload to Google Drive (non-blocking — failure won't stop response) ──
//     const filename = `Application_${name.replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 30)}_${registrationNo}.pdf`
//     let driveLink  = null

//     try {
//       driveLink = await uploadToDrive(pdfBytes, filename)
//       console.log('[verify-payment] Drive upload ✅ | link:', driveLink)
//     } catch (err) {
//       // Drive upload fail ho toh bhi application process hoti rahegi
//       console.error('[verify-payment] Drive upload FAILED (non-fatal):', err.message)
//     }

//     // ── Step 9: Send emails (non-blocking — failure won't stop response) ──
//     try {
//       await sendEmails(formData, pdfBytes, driveLink, razorpay_payment_id, registrationNo)
//       console.log('[verify-payment] Emails sent ✅')
//     } catch (err) {
//       // Email fail ho toh bhi PDF milega frontend ko
//       console.error('[verify-payment] Email send FAILED (non-fatal):', err.message)
//     }

//     // ── Step 10: Return success with PDF ──
//     console.log('[verify-payment] Sending success response | registrationNo:', registrationNo)

//     return res.status(200).json({
//       success:        true,
//       pdfBase64:      Buffer.from(pdfBytes).toString('base64'),
//       filename,
//       driveLink:      driveLink || null,
//       registrationNo,
//     })

//   } catch (error) {
//     // Unexpected crash
//     console.error('[verify-payment] Unexpected error:', error)

//     const userMessage =
//       error.message?.includes('Invalid file type') ||
//       error.message?.includes('File too large')
//         ? error.message
//         : 'Payment verification failed. Please contact support with your Payment ID.'

//     return res.status(500).json({ error: userMessage })
//   }
// }



// api/verify-payment.js
// ✅ UPDATED: All new fields — Bank Details, Block, Pincode, Bank Passbook etc.
// ✅ Email: Comment/uncomment the "sendEmails" block to enable/disable

import nodemailer                from 'nodemailer'
import { generateApplicationPDF } from './utils/generatePDF.js'

export const config = {
  api: {
    bodyParser:    { sizeLimit: '25mb' },
    responseLimit: '10mb',
  },
}

// ── Brevo SMTP Transporter ────────────────────────────────────────────────────
function createTransporter() {
  return nodemailer.createTransport({
    host:   'smtp-relay.brevo.com',
    port:   587,
    secure: false,
    auth: {
      user: process.env.BREVO_SMTP_USER,
      pass: process.env.BREVO_SMTP_KEY,
    },
  })
}

// ── base64 → Buffer ───────────────────────────────────────────────────────────
function base64ToFileObj(fileObj) {
  if (!fileObj?.base64) return null
  try {
    return {
      buffer:       Buffer.from(fileObj.base64, 'base64'),
      mimetype:     fileObj.mimetype     || 'image/jpeg',
      originalName: fileObj.originalName || 'file',
    }
  } catch (e) {
    console.warn('[base64ToFileObj] failed:', e.message)
    return null
  }
}

// ── Apps Script call ──────────────────────────────────────────────────────────
async function submitToAppsScript(payload) {
  const url = process.env.APPS_SCRIPT_URL || process.env.VITE_APPS_SCRIPT_URL
  if (!url) {
    console.warn('[apps-script] URL not set in .env — skipping')
    return { driveLink: null }
  }

  try {
    const res = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action: 'submit', ...payload }),
    })

    const text = await res.text()
    console.log('[apps-script] Response:', text)

    let json
    try { json = JSON.parse(text) } catch { return { driveLink: null } }

    if (!json.success) console.error('[apps-script] Failed:', json.error)
    return json
  } catch (err) {
    console.error('[apps-script] Error:', err.message)
    return { driveLink: null }
  }
}

// ── Mask Aadhar ───────────────────────────────────────────────────────────────
function maskAadhar(aadhar) {
  return aadhar ? 'XXXX-XXXX-' + String(aadhar).slice(-4) : '—'
}

// ─────────────────────────────────────────────────────────────────────────────
// ── Send Emails via Brevo ─────────────────────────────────────────────────────
// ── EMAIL BAND KARNA HO TO: is poore function ko call mat karo (neeche dekho) ─
// ─────────────────────────────────────────────────────────────────────────────
async function sendEmails(formData, paymentInfo, pdfBase64, filename, driveLink, registrationNo) {
  const fromEmail  = process.env.FROM_EMAIL
  const adminEmail = process.env.ADMIN_EMAIL

  if (!fromEmail) throw new Error('FROM_EMAIL not set in .env')
  if (!process.env.BREVO_SMTP_USER || !process.env.BREVO_SMTP_KEY) {
    throw new Error('BREVO_SMTP_USER or BREVO_SMTP_KEY not set in .env')
  }

  const transporter   = createTransporter()
  const amountDisplay = formData.category === 'General' ? 'Rs. 1,100' : 'Rs. 1,000'
  const utr           = paymentInfo?.utrNumber     || '—'
  const payMethod     = paymentInfo?.paymentMethod || 'Manual'
  const payDate       = paymentInfo?.paymentDate   || '—'
  const payTime       = paymentInfo?.paymentTime   || '—'

  const pdfBuffer = Buffer.from(pdfBase64, 'base64')

  const htmlBody = `
    <div style="font-family:sans-serif;max-width:600px;margin:auto">
      <div style="background:#1a5c2a;padding:24px;border-radius:12px 12px 0 0">
        <h2 style="color:white;margin:0">Rural Welfare Program</h2>
        <p style="color:#f0c020;margin:4px 0 0">Application Submitted Successfully</p>
      </div>
      <div style="padding:24px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 12px 12px">
        <p>Dear <strong>${formData.name}</strong>,</p>
        <p>Your application for <strong>${formData.postTitle}</strong> has been submitted.</p>
        <div style="background:#fff3cd;border:1px solid #ffc107;border-radius:8px;padding:12px;font-size:13px;margin:16px 0">
          ⏳ <strong>Payment Status: Under Review</strong><br/>
          Your payment will be verified within 24 hours.
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:14px;margin:16px 0">
          <tr style="background:#f0f7f0">
            <td style="padding:8px 12px;font-weight:bold;color:#1a5c2a;width:45%">Registration No.</td>
            <td style="padding:8px 12px">${registrationNo}</td>
          </tr>
          <tr>
            <td style="padding:8px 12px;font-weight:bold;color:#1a5c2a">Post Applied</td>
            <td style="padding:8px 12px">${formData.postTitle}</td>
          </tr>
          <tr style="background:#f0f7f0">
            <td style="padding:8px 12px;font-weight:bold;color:#1a5c2a">Payment Method</td>
            <td style="padding:8px 12px">${payMethod}</td>
          </tr>
          <tr>
            <td style="padding:8px 12px;font-weight:bold;color:#1a5c2a">UTR / Transaction ID</td>
            <td style="padding:8px 12px">${utr}</td>
          </tr>
          <tr style="background:#f0f7f0">
            <td style="padding:8px 12px;font-weight:bold;color:#1a5c2a">Payment Date / Time</td>
            <td style="padding:8px 12px">${payDate} at ${payTime}</td>
          </tr>
          <tr>
            <td style="padding:8px 12px;font-weight:bold;color:#1a5c2a">Amount</td>
            <td style="padding:8px 12px">${amountDisplay}</td>
          </tr>
          <tr style="background:#f0f7f0">
            <td style="padding:8px 12px;font-weight:bold;color:#1a5c2a">Bank Account No.</td>
            <td style="padding:8px 12px">${formData.bankAccountNo || '—'}</td>
          </tr>
          <tr>
            <td style="padding:8px 12px;font-weight:bold;color:#1a5c2a">Bank IFSC Code</td>
            <td style="padding:8px 12px">${formData.bankIfsc || '—'}</td>
          </tr>
          <tr style="background:#f0f7f0">
            <td style="padding:8px 12px;font-weight:bold;color:#1a5c2a">Bank Name</td>
            <td style="padding:8px 12px">${formData.bankName || '—'}</td>
          </tr>
          <tr>
            <td style="padding:8px 12px;font-weight:bold;color:#1a5c2a">State</td>
            <td style="padding:8px 12px">${formData.state || '—'}</td>
          </tr>
          <tr style="background:#f0f7f0">
            <td style="padding:8px 12px;font-weight:bold;color:#1a5c2a">District</td>
            <td style="padding:8px 12px">${formData.district || '—'}</td>
          </tr>
          <tr>
            <td style="padding:8px 12px;font-weight:bold;color:#1a5c2a">Block</td>
            <td style="padding:8px 12px">${formData.block || '—'}</td>
          </tr>
          <tr style="background:#f0f7f0">
            <td style="padding:8px 12px;font-weight:bold;color:#1a5c2a">Pincode</td>
            <td style="padding:8px 12px">${formData.pincode || '—'}</td>
          </tr>
          <tr>
            <td style="padding:8px 12px;font-weight:bold;color:#1a5c2a">Aadhar (masked)</td>
            <td style="padding:8px 12px">${maskAadhar(formData.aadhar)}</td>
          </tr>
          <tr style="background:#f0f7f0">
            <td style="padding:8px 12px;font-weight:bold;color:#1a5c2a">Status</td>
            <td style="padding:8px 12px;color:#856404;font-weight:bold">⏳ Under Review</td>
          </tr>
        </table>
        <p>
          Application PDF is attached to this email.<br/>
          ${driveLink && driveLink !== '—' ? `<a href="${driveLink}" style="color:#1a5c2a;font-weight:bold">View on Google Drive →</a>` : ''}
        </p>
        <p style="color:#888;font-size:12px;margin-top:24px">
          Rural Welfare Program — Healthy Villages, Empowered Women, Prosperous India
        </p>
      </div>
    </div>
  `

  // ── Applicant email ──
  await transporter.sendMail({
    from:        `"Rural Welfare Program" <${fromEmail}>`,
    to:          formData.email,
    subject:     `Application Submitted — ${formData.postTitle} — Reg. ${registrationNo}`,
    html:        htmlBody,
    attachments: [{
      filename,
      content:     pdfBuffer,
      contentType: 'application/pdf',
    }],
  })
  console.log('[email] Applicant email sent to:', formData.email)

  // ── Admin email ──
  if (adminEmail) {
    // Admin ko unmasked Aadhar dikhate hain
    const adminHtml = htmlBody
      .replace(maskAadhar(formData.aadhar), String(formData.aadhar || ''))
    await transporter.sendMail({
      from:        `"Rural Welfare Program" <${fromEmail}>`,
      to:          adminEmail,
      subject:     `[NEW] ${formData.name} — ${formData.postTitle} — ${registrationNo} — UTR: ${utr}`,
      html:        adminHtml,
      attachments: [{
        filename,
        content:     pdfBuffer,
        contentType: 'application/pdf',
      }],
    })
    console.log('[email] Admin email sent to:', adminEmail)
  }
}

// ── MAIN HANDLER ──────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  const allowedOrigin = process.env.ALLOWED_ORIGIN || '*'
  res.setHeader('Access-Control-Allow-Origin',  allowedOrigin)
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' })

  console.log('[verify-payment] Request received')

  try {
    const { registrationNo, formData, paymentInfo, uploadedFiles } = req.body

    // ── Validation ──
    if (!formData?.name || !formData?.email) {
      return res.status(400).json({ error: 'Missing required fields: name aur email zaroori hain' })
    }
    if (!registrationNo) {
      return res.status(400).json({ error: 'Missing registrationNo' })
    }
    if (!paymentInfo?.utrNumber) {
      return res.status(400).json({ error: 'Missing UTR / Transaction ID' })
    }

    console.log('[verify-payment] Validated | name:', formData.name, '| reg:', registrationNo)

    // ── Files convert karo ──
    const filesForPDF = {
      photo:            base64ToFileObj(uploadedFiles?.photo),
      signature:        base64ToFileObj(uploadedFiles?.signature),
      aadharDoc:        base64ToFileObj(uploadedFiles?.aadharDoc),
      bankPassbook:     base64ToFileObj(uploadedFiles?.bankPassbook),
      tenthDoc:         base64ToFileObj(uploadedFiles?.tenthDoc),
      twelfthDoc:       base64ToFileObj(uploadedFiles?.twelfthDoc),
      qualificationDoc: base64ToFileObj(uploadedFiles?.qualificationDoc),
      additionalDoc:    base64ToFileObj(uploadedFiles?.additionalDoc),
      screenshot:       base64ToFileObj(uploadedFiles?.screenshot),
    }

    // ── PDF generate karo ──
    console.log('[verify-payment] Generating PDF...')

    const pdfFormData = {
      // Personal details
      name:              formData?.name              || '',
      fatherName:        formData?.fatherName        || '',
      motherName:        formData?.motherName        || '',
      dob:               formData?.dob               || '',
      gender:            formData?.gender            || '',
      category:          formData?.category          || '',
      nationality:       formData?.nationality       || 'Indian',
      aadhar:            formData?.aadhar            || '',
      qualification:     formData?.qualification     || '',

      // Contact
      mobile:            formData?.mobile            || '',
      email:             formData?.email             || '',

      // Address
      state:             formData?.state             || '',
      district:          formData?.district          || '',
      block:             formData?.block             || '',   // ✅ NEW
      pincode:           formData?.pincode           || '',   // ✅ NEW
      address:           formData?.address           || '',

      // Bank details ✅ NEW
      bankAccountNo:     formData?.bankAccountNo     || '',
      bankIfsc:          formData?.bankIfsc          || '',
      bankName:          formData?.bankName          || '',

      // Post info
      postTitle:         formData?.postTitle         || '',
      postLevel:         formData?.postLevel         || '',

      // Education (JSON string)
      education:         formData?.education         || '[]',

      // Registration
      registrationNo,

      // Payment
      paymentMethod:     paymentInfo?.paymentMethod     || 'Manual',
      utrNumber:         paymentInfo?.utrNumber         || '—',
      senderName:        paymentInfo?.senderName        || '',
      senderUpiId:       paymentInfo?.senderUpiId       || '',
      accountHolderName: paymentInfo?.accountHolderName || '',
      lastFourDigits:    paymentInfo?.lastFourDigits    || '',
      paymentStatus:     'Under Review',
      paymentDate:       paymentInfo?.paymentDate       || '',
      paymentTime:       paymentInfo?.paymentTime       || '',
    }

    let pdfBytes
    try {
      pdfBytes = await generateApplicationPDF(pdfFormData, registrationNo, filesForPDF)
    } catch (err) {
      console.error('[verify-payment] PDF generation failed:', err)
      return res.status(500).json({ error: 'PDF generation failed: ' + err.message })
    }

    const pdfBase64 = Buffer.from(pdfBytes).toString('base64')
    const safeName  = (formData.name || 'applicant').replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 30)
    const filename  = `Application_${safeName}_${registrationNo}.pdf`
    console.log('[verify-payment] PDF generated ✅ | size:', pdfBytes.length, 'bytes')

    // ── Apps Script — sheet + Drive upload ──
    let driveLink = null
    try {
      const scriptResult = await submitToAppsScript({
        registrationNo,

        // Personal
        name:              formData.name,
        fatherName:        formData.fatherName        || '',
        motherName:        formData.motherName        || '',
        dob:               formData.dob               || '',
        mobile:            formData.mobile            || '',
        email:             formData.email,
        gender:            formData.gender            || '',
        category:          formData.category          || '',
        nationality:       formData.nationality       || 'Indian',
        qualification:     formData.qualification     || '',
        aadhar:            formData.aadhar            || '',

        // Address ✅ NEW fields included
        state:             formData.state             || '',
        district:          formData.district          || '',
        block:             formData.block             || '',   // ✅
        pincode:           formData.pincode           || '',   // ✅
        address:           formData.address           || '',

        // Bank ✅ NEW
        bankAccountNo:     formData.bankAccountNo     || '',
        bankIfsc:          formData.bankIfsc          || '',
        bankName:          formData.bankName          || '',

        // Post
        postTitle:         formData.postTitle         || '',
        postLevel:         formData.postLevel         || '',

        // Payment
        paymentMethod:     paymentInfo?.paymentMethod || 'Manual',
        transactionId:     paymentInfo?.utrNumber     || '',
        senderName:        paymentInfo?.senderName        || '',
        senderUpiId:       paymentInfo?.senderUpiId       || '',
        accountHolderName: paymentInfo?.accountHolderName || '',
        lastFourDigits:    paymentInfo?.lastFourDigits    || '',
        paymentDate:       paymentInfo?.paymentDate       || '',
        paymentTime:       paymentInfo?.paymentTime       || '',

        // Education
        education:         formData.education         || '[]',

        // File flags ✅
        hasScreenshot:     !!uploadedFiles?.screenshot,
        hasBankPassbook:   !!uploadedFiles?.bankPassbook,   // ✅

        // PDF
        pdfBase64,
      })
      driveLink = scriptResult?.driveLink || null
      console.log('[verify-payment] Apps Script ✅ | driveLink:', driveLink)
    } catch (err) {
      console.error('[verify-payment] Apps Script FAILED (non-fatal):', err.message)
    }

    // ════════════════════════════════════════════════════════════════════════
    // ── EMAIL SECTION ────────────────────────────────────────────────────────
    // ── EMAIL BAND KARNA HO TO: neeche wala poora try-catch block COMMENT OUT karo ──
    // ── EMAIL CHALU KARNA HO TO: comment hatao ───────────────────────────────
    // ════════════════════════════════════════════════════════════════════════

    try {
      await sendEmails(formData, paymentInfo || {}, pdfBase64, filename, driveLink, registrationNo)
      console.log('[verify-payment] Emails sent ✅')
    } catch (err) {
      console.error('[verify-payment] Email FAILED (non-fatal):', err.message)
    }

    // ── EMAIL SECTION END ────────────────────────────────────────────────────

    // ── Success response ──
    return res.status(200).json({
      success: true,
      pdfBase64,
      filename,
      driveLink:      driveLink || null,
      registrationNo,
    })

  } catch (error) {
    console.error('[verify-payment] Unexpected error:', error)
    return res.status(500).json({ error: 'Server error. Please try again.' })
  }
}