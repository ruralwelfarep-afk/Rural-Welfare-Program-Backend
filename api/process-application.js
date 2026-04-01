// api/process-application.js
// ✅ BACKGROUND PROCESSOR — PDF generate karo, Drive pe upload karo, email bhejo
// ✅ Frontend wait nahi karta — ye endpoint background mein chalta hai
// ✅ Fail hone pe bhi user ko koi problem nahi — registration already ho chuki hai
// ✅ Internal calls ke liye ek shared secret se authenticate karo (optional but recommended)

import nodemailer                from 'nodemailer'
import { generateApplicationPDF } from './utils/generatePDF.js'

export const config = {
  api: {
    bodyParser:    { sizeLimit: '30mb' },
    responseLimit: '1mb',
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
    console.warn('[process-application] base64ToFileObj failed:', e.message)
    return null
  }
}

// ── Apps Script — Drive upload ────────────────────────────────────────────────
async function uploadPDFToDrive(registrationNo, name, pdfBase64) {
  const url = process.env.APPS_SCRIPT_URL || process.env.VITE_APPS_SCRIPT_URL
  if (!url) { console.warn('[process-application] APPS_SCRIPT_URL not set'); return null }

  try {
    const res = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action: 'uploadPDF', registrationNo, name, pdfBase64 }),
    })
    const text = await res.text()
    let json
    try { json = JSON.parse(text) } catch { return null }
    return json?.driveLink || null
  } catch (err) {
    console.error('[process-application] Drive upload error:', err.message)
    return null
  }
}

// ── Mask Aadhar ───────────────────────────────────────────────────────────────
function maskAadhar(aadhar) {
  return aadhar ? 'XXXX-XXXX-' + String(aadhar).slice(-4) : '—'
}

// ── Send Emails ───────────────────────────────────────────────────────────────
async function sendEmails(formData, paymentInfo, pdfBase64, filename, driveLink, registrationNo) {
  const fromEmail  = process.env.FROM_EMAIL
  const adminEmail = process.env.ADMIN_EMAIL

  if (!fromEmail || !process.env.BREVO_SMTP_USER || !process.env.BREVO_SMTP_KEY) {
    console.warn('[process-application] Email env vars missing — skipping email')
    return
  }

  const transporter   = createTransporter()
  const amountDisplay = formData.category === 'General' ? 'Rs. 1,100' : 'Rs. 1,000'
  const utr           = paymentInfo?.utrNumber     || '—'
  const payMethod     = paymentInfo?.paymentMethod || 'Manual'
  const payDate       = paymentInfo?.paymentDate   || '—'
  const payTime       = paymentInfo?.paymentTime   || '—'
  const pdfBuffer     = Buffer.from(pdfBase64, 'base64')

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
            <td style="padding:8px 12px;font-weight:bold;color:#1a5c2a">Aadhar (masked)</td>
            <td style="padding:8px 12px">${maskAadhar(formData.aadhar)}</td>
          </tr>
          <tr>
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

  // Applicant email
  await transporter.sendMail({
    from:        `"Rural Welfare Program" <${fromEmail}>`,
    to:          formData.email,
    subject:     `Application Submitted — ${formData.postTitle} — Reg. ${registrationNo}`,
    html:        htmlBody,
    attachments: [{ filename, content: pdfBuffer, contentType: 'application/pdf' }],
  })
  console.log('[process-application] Applicant email sent to:', formData.email)

  // Admin email
  if (adminEmail) {
    const adminHtml = htmlBody.replace(maskAadhar(formData.aadhar), String(formData.aadhar || ''))
    await transporter.sendMail({
      from:        `"Rural Welfare Program" <${fromEmail}>`,
      to:          adminEmail,
      subject:     `[NEW] ${formData.name} — ${formData.postTitle} — ${registrationNo} — UTR: ${utr}`,
      html:        adminHtml,
      attachments: [{ filename, content: pdfBuffer, contentType: 'application/pdf' }],
    })
    console.log('[process-application] Admin email sent to:', adminEmail)
  }
}

// ── MAIN HANDLER ──────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  // CORS
  const allowedOrigin = process.env.ALLOWED_ORIGIN || '*'
  res.setHeader('Access-Control-Allow-Origin',  allowedOrigin)
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-internal-secret')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' })

  // ── Optional: Internal secret check (recommended for production) ──
  // PROCESS_SECRET env mein set karo aur quick-submit.js mein bhi same secret bhejo
  const secret = process.env.PROCESS_SECRET
  if (secret) {
    const incoming = req.headers['x-internal-secret']
    if (incoming !== secret) {
      console.warn('[process-application] Unauthorized call — secret mismatch')
      return res.status(401).json({ error: 'Unauthorized' })
    }
  }

  console.log('[process-application] Background processing started')

  // ── Immediately 200 return karo — processing background mein hogi ──
  // Ye zaruri hai taaki caller (quick-submit) hang na kare
  res.status(200).json({ success: true, message: 'Processing started' })

  // ── Baaki sab response ke baad run karo ──
  // Note: Vercel pe setImmediate ya process.nextTick kaam karta hai
  // Lekin agar function terminate ho to kuch kaam chhoot sakta hai
  // Production mein queue system (BullMQ, Inngest) best practice hai
  setImmediate(async () => {
    try {
      const { formData, paymentInfo, uploadedFiles, registrationNo } = req.body

      if (!formData || !registrationNo) {
        console.error('[process-application] Missing formData or registrationNo')
        return
      }

      console.log('[process-application] Processing for regNo:', registrationNo)

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
      const pdfFormData = {
        name:              formData?.name              || '',
        fatherName:        formData?.fatherName        || '',
        motherName:        formData?.motherName        || '',
        dob:               formData?.dob               || '',
        gender:            formData?.gender            || '',
        category:          formData?.category          || '',
        nationality:       formData?.nationality       || 'Indian',
        aadhar:            formData?.aadhar            || '',
        qualification:     formData?.qualification     || '',
        mobile:            formData?.mobile            || '',
        email:             formData?.email             || '',
        state:             formData?.state             || '',
        district:          formData?.district          || '',
        block:             formData?.block             || '',
        pincode:           formData?.pincode           || '',
        address:           formData?.address           || '',
        bankAccountNo:     formData?.bankAccountNo     || '',
        bankIfsc:          formData?.bankIfsc          || '',
        bankName:          formData?.bankName          || '',
        postTitle:         formData?.postTitle         || '',
        postLevel:         formData?.postLevel         || '',
        education:         formData?.education         || '[]',
        registrationNo,
        paymentMethod:     paymentInfo?.paymentMethod     || 'UPI',
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
        console.log('[process-application] PDF generated ✅ | size:', pdfBytes.length, 'bytes')
      } catch (pdfErr) {
        console.error('[process-application] PDF generation failed:', pdfErr.message)
        return // PDF fail — email bhi nahi bhejenge (no PDF to attach)
      }

      const pdfBase64 = Buffer.from(pdfBytes).toString('base64')
      const safeName  = (formData.name || 'applicant').replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 30)
      const filename  = `Application_${safeName}_${registrationNo}.pdf`

      // ── Drive pe upload karo ──
      let driveLink = null
      try {
        driveLink = await uploadPDFToDrive(registrationNo, formData.name, pdfBase64)
        console.log('[process-application] Drive upload ✅ | link:', driveLink)
      } catch (driveErr) {
        console.error('[process-application] Drive upload failed (non-fatal):', driveErr.message)
      }

      // ── Email bhejo ──
      try {
        await sendEmails(formData, paymentInfo || {}, pdfBase64, filename, driveLink, registrationNo)
        console.log('[process-application] Emails sent ✅')
      } catch (emailErr) {
        console.error('[process-application] Email failed (non-fatal):', emailErr.message)
      }

      console.log('[process-application] All done for regNo:', registrationNo)

    } catch (bgErr) {
      // Ye error user ko affect nahi karta — registration already ho chuki hai
      console.error('[process-application] Background error (non-fatal):', bgErr.message)
    }
  })
}