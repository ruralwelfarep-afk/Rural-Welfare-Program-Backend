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