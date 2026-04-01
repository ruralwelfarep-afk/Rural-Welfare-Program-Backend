// // api/verify-payment.js
// // ✅ FIXED: registrationNo ab backend mein generate hota hai — frontend se nahi aata
// // ✅ Apps Script handleSubmit se registrationNo return hota hai
// // ✅ req.body properly destructure kiya gaya hai

// import nodemailer                from 'nodemailer'
// import { generateApplicationPDF } from './utils/generatePDF.js'

// export const config = {
//   api: {
//     bodyParser:    { sizeLimit: '25mb' },
//     responseLimit: '10mb',
//   },
// }

// // ── Brevo SMTP Transporter ────────────────────────────────────────────────────
// function createTransporter() {
//   return nodemailer.createTransport({
//     host:   'smtp-relay.brevo.com',
//     port:   587,
//     secure: false,
//     auth: {
//       user: process.env.BREVO_SMTP_USER,
//       pass: process.env.BREVO_SMTP_KEY,
//     },
//   })
// }

// // ── base64 → Buffer ───────────────────────────────────────────────────────────
// function base64ToFileObj(fileObj) {
//   if (!fileObj?.base64) return null
//   try {
//     return {
//       buffer:       Buffer.from(fileObj.base64, 'base64'),
//       mimetype:     fileObj.mimetype     || 'image/jpeg',
//       originalName: fileObj.originalName || 'file',
//     }
//   } catch (e) {
//     console.warn('[base64ToFileObj] failed:', e.message)
//     return null
//   }
// }

// // ── Apps Script call ──────────────────────────────────────────────────────────
// // ✅ registrationNo Apps Script ke handleSubmit mein generate hoga
// // ✅ Response mein registrationNo aayega
// async function submitToAppsScript(payload) {
//   const url = process.env.APPS_SCRIPT_URL || process.env.VITE_APPS_SCRIPT_URL
//   if (!url) {
//     console.warn('[apps-script] URL not set in .env — skipping')
//     return { success: false, driveLink: null, registrationNo: null }
//   }

//   try {
//     const res = await fetch(url, {
//       method:  'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body:    JSON.stringify({ action: 'submit', ...payload }),
//     })

//     const text = await res.text()
//     console.log('[apps-script] Response:', text)

//     let json
//     try { json = JSON.parse(text) } catch { return { driveLink: null, registrationNo: null } }

//     if (!json.success) console.error('[apps-script] Failed:', json.error)
//     return json
//   } catch (err) {
//     console.error('[apps-script] Error:', err.message)
//     return { driveLink: null, registrationNo: null }
//   }
// }

// // ── Mask Aadhar ───────────────────────────────────────────────────────────────
// function maskAadhar(aadhar) {
//   return aadhar ? 'XXXX-XXXX-' + String(aadhar).slice(-4) : '—'
// }

// // ── Send Emails via Brevo ─────────────────────────────────────────────────────
// // EMAIL BAND KARNA HO TO: handler mein sendEmails call ko comment out karo
// async function sendEmails(formData, paymentInfo, pdfBase64, filename, driveLink, registrationNo) {
//   const fromEmail  = process.env.FROM_EMAIL
//   const adminEmail = process.env.ADMIN_EMAIL

//   if (!fromEmail) throw new Error('FROM_EMAIL not set in .env')
//   if (!process.env.BREVO_SMTP_USER || !process.env.BREVO_SMTP_KEY) {
//     throw new Error('BREVO_SMTP_USER or BREVO_SMTP_KEY not set in .env')
//   }

//   const transporter   = createTransporter()
//   const amountDisplay = formData.category === 'General' ? 'Rs. 1,100' : 'Rs. 1,000'
//   const utr           = paymentInfo?.utrNumber     || '—'
//   const payMethod     = paymentInfo?.paymentMethod || 'Manual'
//   const payDate       = paymentInfo?.paymentDate   || '—'
//   const payTime       = paymentInfo?.paymentTime   || '—'

//   const pdfBuffer = Buffer.from(pdfBase64, 'base64')

//   const htmlBody = `
//     <div style="font-family:sans-serif;max-width:600px;margin:auto">
//       <div style="background:#1a5c2a;padding:24px;border-radius:12px 12px 0 0">
//         <h2 style="color:white;margin:0">Rural Welfare Program</h2>
//         <p style="color:#f0c020;margin:4px 0 0">Application Submitted Successfully</p>
//       </div>
//       <div style="padding:24px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 12px 12px">
//         <p>Dear <strong>${formData.name}</strong>,</p>
//         <p>Your application for <strong>${formData.postTitle}</strong> has been submitted.</p>
//         <div style="background:#fff3cd;border:1px solid #ffc107;border-radius:8px;padding:12px;font-size:13px;margin:16px 0">
//           ⏳ <strong>Payment Status: Under Review</strong><br/>
//           Your payment will be verified within 24 hours.
//         </div>
//         <table style="width:100%;border-collapse:collapse;font-size:14px;margin:16px 0">
//           <tr style="background:#f0f7f0">
//             <td style="padding:8px 12px;font-weight:bold;color:#1a5c2a;width:45%">Registration No.</td>
//             <td style="padding:8px 12px">${registrationNo}</td>
//           </tr>
//           <tr>
//             <td style="padding:8px 12px;font-weight:bold;color:#1a5c2a">Post Applied</td>
//             <td style="padding:8px 12px">${formData.postTitle}</td>
//           </tr>
//           <tr style="background:#f0f7f0">
//             <td style="padding:8px 12px;font-weight:bold;color:#1a5c2a">Payment Method</td>
//             <td style="padding:8px 12px">${payMethod}</td>
//           </tr>
//           <tr>
//             <td style="padding:8px 12px;font-weight:bold;color:#1a5c2a">UTR / Transaction ID</td>
//             <td style="padding:8px 12px">${utr}</td>
//           </tr>
//           <tr style="background:#f0f7f0">
//             <td style="padding:8px 12px;font-weight:bold;color:#1a5c2a">Payment Date / Time</td>
//             <td style="padding:8px 12px">${payDate} at ${payTime}</td>
//           </tr>
//           <tr>
//             <td style="padding:8px 12px;font-weight:bold;color:#1a5c2a">Amount</td>
//             <td style="padding:8px 12px">${amountDisplay}</td>
//           </tr>
//           <tr style="background:#f0f7f0">
//             <td style="padding:8px 12px;font-weight:bold;color:#1a5c2a">Bank Account No.</td>
//             <td style="padding:8px 12px">${formData.bankAccountNo || '—'}</td>
//           </tr>
//           <tr>
//             <td style="padding:8px 12px;font-weight:bold;color:#1a5c2a">Bank IFSC Code</td>
//             <td style="padding:8px 12px">${formData.bankIfsc || '—'}</td>
//           </tr>
//           <tr style="background:#f0f7f0">
//             <td style="padding:8px 12px;font-weight:bold;color:#1a5c2a">Bank Name</td>
//             <td style="padding:8px 12px">${formData.bankName || '—'}</td>
//           </tr>
//           <tr>
//             <td style="padding:8px 12px;font-weight:bold;color:#1a5c2a">State</td>
//             <td style="padding:8px 12px">${formData.state || '—'}</td>
//           </tr>
//           <tr style="background:#f0f7f0">
//             <td style="padding:8px 12px;font-weight:bold;color:#1a5c2a">District</td>
//             <td style="padding:8px 12px">${formData.district || '—'}</td>
//           </tr>
//           <tr>
//             <td style="padding:8px 12px;font-weight:bold;color:#1a5c2a">Block</td>
//             <td style="padding:8px 12px">${formData.block || '—'}</td>
//           </tr>
//           <tr style="background:#f0f7f0">
//             <td style="padding:8px 12px;font-weight:bold;color:#1a5c2a">Pincode</td>
//             <td style="padding:8px 12px">${formData.pincode || '—'}</td>
//           </tr>
//           <tr>
//             <td style="padding:8px 12px;font-weight:bold;color:#1a5c2a">Aadhar (masked)</td>
//             <td style="padding:8px 12px">${maskAadhar(formData.aadhar)}</td>
//           </tr>
//           <tr style="background:#f0f7f0">
//             <td style="padding:8px 12px;font-weight:bold;color:#1a5c2a">Status</td>
//             <td style="padding:8px 12px;color:#856404;font-weight:bold">⏳ Under Review</td>
//           </tr>
//         </table>
//         <p>
//           Application PDF is attached to this email.<br/>
//           ${driveLink && driveLink !== '—' ? `<a href="${driveLink}" style="color:#1a5c2a;font-weight:bold">View on Google Drive →</a>` : ''}
//         </p>
//         <p style="color:#888;font-size:12px;margin-top:24px">
//           Rural Welfare Program — Healthy Villages, Empowered Women, Prosperous India
//         </p>
//       </div>
//     </div>
//   `

//   await transporter.sendMail({
//     from:        `"Rural Welfare Program" <${fromEmail}>`,
//     to:          formData.email,
//     subject:     `Application Submitted — ${formData.postTitle} — Reg. ${registrationNo}`,
//     html:        htmlBody,
//     attachments: [{ filename, content: pdfBuffer, contentType: 'application/pdf' }],
//   })
//   console.log('[email] Applicant email sent to:', formData.email)

//   if (adminEmail) {
//     const adminHtml = htmlBody.replace(maskAadhar(formData.aadhar), String(formData.aadhar || ''))
//     await transporter.sendMail({
//       from:        `"Rural Welfare Program" <${fromEmail}>`,
//       to:          adminEmail,
//       subject:     `[NEW] ${formData.name} — ${formData.postTitle} — ${registrationNo} — UTR: ${utr}`,
//       html:        adminHtml,
//       attachments: [{ filename, content: pdfBuffer, contentType: 'application/pdf' }],
//     })
//     console.log('[email] Admin email sent to:', adminEmail)
//   }
// }

// // ── MAIN HANDLER ──────────────────────────────────────────────────────────────
// export default async function handler(req, res) {
//   const allowedOrigin = process.env.ALLOWED_ORIGIN || '*'
//   res.setHeader('Access-Control-Allow-Origin',  allowedOrigin)
//   res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
//   res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
//   if (req.method === 'OPTIONS') return res.status(200).end()
//   if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' })

//   console.log('[verify-payment] Request received')

//   try {
//     // ✅ req.body properly destructure karo — registrationNo frontend se nahi aata
//     const { formData, paymentInfo, uploadedFiles } = req.body

//     // ── Validation ──
//     if (!formData?.name || !formData?.email) {
//       return res.status(400).json({ error: 'Missing required fields: name aur email zaroori hain' })
//     }
//     // if (!paymentInfo?.utrNumber) {
//     //   return res.status(400).json({ error: 'Missing UTR / Transaction ID' })
//     // }

//     console.log('[verify-payment] Validated | name:', formData.name)

//     // ── Files convert karo ──
//     const filesForPDF = {
//       photo:            base64ToFileObj(uploadedFiles?.photo),
//       signature:        base64ToFileObj(uploadedFiles?.signature),
//       aadharDoc:        base64ToFileObj(uploadedFiles?.aadharDoc),
//       bankPassbook:     base64ToFileObj(uploadedFiles?.bankPassbook),
//       tenthDoc:         base64ToFileObj(uploadedFiles?.tenthDoc),
//       twelfthDoc:       base64ToFileObj(uploadedFiles?.twelfthDoc),
//       qualificationDoc: base64ToFileObj(uploadedFiles?.qualificationDoc),
//       additionalDoc:    base64ToFileObj(uploadedFiles?.additionalDoc),
//       screenshot:       base64ToFileObj(uploadedFiles?.screenshot),
//     }

//     // ── Apps Script call — registrationNo wahan generate hoga ──
//     // PDF generate karne ke liye placeholder use karte hain pehle
//     // Phir real registrationNo se PDF regenerate karenge
//     console.log('[verify-payment] Calling Apps Script for registration no + sheet entry...')

//     const scriptResult = await submitToAppsScript({
//       // ✅ registrationNo nahi bhejte — Apps Script khud generate karega
//       name:              formData.name,
//       fatherName:        formData.fatherName        || '',
//       motherName:        formData.motherName        || '',
//       dob:               formData.dob               || '',
//       mobile:            formData.mobile            || '',
//       email:             formData.email,
//       gender:            formData.gender            || '',
//       category:          formData.category          || '',
//       nationality:       formData.nationality       || 'Indian',
//       qualification:     formData.qualification     || '',
//       aadhar:            formData.aadhar            || '',
//       state:             formData.state             || '',
//       district:          formData.district          || '',
//       block:             formData.block             || '',
//       pincode:           formData.pincode           || '',
//       address:           formData.address           || '',
//       bankAccountNo:     formData.bankAccountNo     || '',
//       bankIfsc:          formData.bankIfsc          || '',
//       bankName:          formData.bankName          || '',
//       postTitle:         formData.postTitle         || '',
//       postLevel:         formData.postLevel         || '',
//       paymentMethod:     paymentInfo?.paymentMethod || 'Manual',
//       transactionId:     paymentInfo?.utrNumber     || '',
//       senderName:        paymentInfo?.senderName        || '',
//       senderUpiId:       paymentInfo?.senderUpiId       || '',
//       accountHolderName: paymentInfo?.accountHolderName || '',
//       lastFourDigits:    paymentInfo?.lastFourDigits    || '',
//       paymentDate:       paymentInfo?.paymentDate       || '',
//       paymentTime:       paymentInfo?.paymentTime       || '',
//       education:         formData.education         || '[]',
//       hasScreenshot:     !!uploadedFiles?.screenshot,
//       hasBankPassbook:   !!uploadedFiles?.bankPassbook,
//       // pdfBase64 baad mein bhejenge — pehle registrationNo lo
//     })

//     // ✅ registrationNo Apps Script se aaya
//     const registrationNo = scriptResult?.registrationNo
//     if (!registrationNo) {
//       console.error('[verify-payment] registrationNo missing from Apps Script response')
//       return res.status(500).json({ error: 'Registration number generate nahi hua. Please try again.' })
//     }

//     console.log('[verify-payment] RegNo from Apps Script:', registrationNo)

//     // ── PDF generate karo — ab registrationNo available hai ──
//     console.log('[verify-payment] Generating PDF...')
//     const pdfFormData = {
//       name:              formData?.name              || '',
//       fatherName:        formData?.fatherName        || '',
//       motherName:        formData?.motherName        || '',
//       dob:               formData?.dob               || '',
//       gender:            formData?.gender            || '',
//       category:          formData?.category          || '',
//       nationality:       formData?.nationality       || 'Indian',
//       aadhar:            formData?.aadhar            || '',
//       qualification:     formData?.qualification     || '',
//       mobile:            formData?.mobile            || '',
//       email:             formData?.email             || '',
//       state:             formData?.state             || '',
//       district:          formData?.district          || '',
//       block:             formData?.block             || '',
//       pincode:           formData?.pincode           || '',
//       address:           formData?.address           || '',
//       bankAccountNo:     formData?.bankAccountNo     || '',
//       bankIfsc:          formData?.bankIfsc          || '',
//       bankName:          formData?.bankName          || '',
//       postTitle:         formData?.postTitle         || '',
//       postLevel:         formData?.postLevel         || '',
//       education:         formData?.education         || '[]',
//       registrationNo,
//       paymentMethod:     paymentInfo?.paymentMethod     || 'Manual',
//       utrNumber:         paymentInfo?.utrNumber         || '—',
//       senderName:        paymentInfo?.senderName        || '',
//       senderUpiId:       paymentInfo?.senderUpiId       || '',
//       accountHolderName: paymentInfo?.accountHolderName || '',
//       lastFourDigits:    paymentInfo?.lastFourDigits    || '',
//       paymentStatus:     'Under Review',
//       paymentDate:       paymentInfo?.paymentDate       || '',
//       paymentTime:       paymentInfo?.paymentTime       || '',
//     }

//     let pdfBytes
//     try {
//       pdfBytes = await generateApplicationPDF(pdfFormData, registrationNo, filesForPDF)
//     } catch (err) {
//       console.error('[verify-payment] PDF generation failed:', err)
//       return res.status(500).json({ error: 'PDF generation failed: ' + err.message })
//     }

//     const pdfBase64 = Buffer.from(pdfBytes).toString('base64')
//     const safeName  = (formData.name || 'applicant').replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 30)
//     const filename  = `Application_${safeName}_${registrationNo}.pdf`
//     console.log('[verify-payment] PDF generated ✅ | size:', pdfBytes.length, 'bytes')

//     // ── PDF Drive pe upload karo (separate call) ──
//     let driveLink = scriptResult?.driveLink || null
//     if (!driveLink || driveLink === '—') {
//       try {
//         const uploadResult = await submitToAppsScript({
//           action:         'uploadPDF',
//           registrationNo,
//           name:           formData.name,
//           pdfBase64,
//         })
//         driveLink = uploadResult?.driveLink || null
//         console.log('[verify-payment] Drive upload ✅ | driveLink:', driveLink)
//       } catch (err) {
//         console.error('[verify-payment] Drive upload FAILED (non-fatal):', err.message)
//       }
//     }

//     // ── Email bhejo ──
//     // EMAIL BAND KARNA HO TO: neeche wala try-catch block comment out karo
//     try {
//       await sendEmails(formData, paymentInfo || {}, pdfBase64, filename, driveLink, registrationNo)
//       console.log('[verify-payment] Emails sent ✅')
//     } catch (err) {
//       console.error('[verify-payment] Email FAILED (non-fatal):', err.message)
//     }
//     // EMAIL SECTION END

//     // ── Success response ──
//     return res.status(200).json({
//       success: true,
//       pdfBase64,
//       filename,
//       driveLink:      driveLink || null,
//       registrationNo,  // ✅ Apps Script se aaya, frontend ko bheja
//     })

//   } catch (error) {
//     console.error('[verify-payment] Unexpected error:', error)
//     return res.status(500).json({ error: 'Server error. Please try again.' })
//   }
// }




// api/verify-payment.js — with detailed stage-by-stage logging

import nodemailer from 'nodemailer'
import { generateApplicationPDF } from './utils/generatePDF.js'

export const config = {
  api: {
    bodyParser:    { sizeLimit: '25mb' },
    responseLimit: '10mb',
  },
}

// ── Structured logger ─────────────────────────────────────────────────────────
function log(stage, msg, data = null) {
  const entry = {
    ts:    new Date().toISOString(),
    stage,
    msg,
    ...(data !== null ? { data } : {}),
  }
  console.log(JSON.stringify(entry))
}

function logError(stage, msg, err) {
  console.error(JSON.stringify({
    ts:      new Date().toISOString(),
    stage,
    msg,
    error:   err?.message || String(err),
    stack:   err?.stack?.split('\n').slice(0, 6).join(' | ') || null,
  }))
}

// ── helpers (unchanged) ───────────────────────────────────────────────────────
function createTransporter() {
  return nodemailer.createTransport({
    host: 'smtp-relay.brevo.com', port: 587, secure: false,
    auth: { user: process.env.BREVO_SMTP_USER, pass: process.env.BREVO_SMTP_KEY },
  })
}

function base64ToFileObj(fileObj) {
  if (!fileObj?.base64) return null
  try {
    return {
      buffer:       Buffer.from(fileObj.base64, 'base64'),
      mimetype:     fileObj.mimetype     || 'image/jpeg',
      originalName: fileObj.originalName || 'file',
    }
  } catch (e) {
    logError('base64ToFileObj', 'Conversion failed', e)
    return null
  }
}

function maskAadhar(aadhar) {
  return aadhar ? 'XXXX-XXXX-' + String(aadhar).slice(-4) : '—'
}

// ── Apps Script ───────────────────────────────────────────────────────────────
async function submitToAppsScript(payload) {
  const url = process.env.APPS_SCRIPT_URL || process.env.VITE_APPS_SCRIPT_URL
  if (!url) {
    log('apps-script', 'URL not set — skipping', { envKeys: Object.keys(process.env).filter(k => k.includes('SCRIPT')) })
    return { success: false, driveLink: null, registrationNo: null }
  }

  log('apps-script', 'Calling Apps Script', { url: url.slice(0, 60) + '...' })

  try {
    const res  = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action: 'submit', ...payload }),
    })

    log('apps-script', 'Response received', { status: res.status, ok: res.ok })

    const text = await res.text()
    log('apps-script', 'Raw response', { preview: text.slice(0, 200) })

    let json
    try { json = JSON.parse(text) }
    catch (parseErr) {
      logError('apps-script', 'JSON parse failed', parseErr)
      return { driveLink: null, registrationNo: null }
    }

    if (!json.success) {
      log('apps-script', 'Script returned failure', { error: json.error })
    } else {
      log('apps-script', 'Success', { registrationNo: json.registrationNo })
    }

    return json
  } catch (err) {
    logError('apps-script', 'Fetch threw', err)
    return { driveLink: null, registrationNo: null }
  }
}

// ── Background tasks (fire-and-forget, unchanged) ────────────────────────────
async function uploadPDFInBackground(pdfBase64, registrationNo, name) {
  const url = process.env.APPS_SCRIPT_URL || process.env.VITE_APPS_SCRIPT_URL
  if (!url) return
  try {
    const res  = await fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body:   JSON.stringify({ action: 'uploadPDF', registrationNo, name, pdfBase64 }),
    })
    const text = await res.text()
    let json; try { json = JSON.parse(text) } catch { return }
    json?.driveLink
      ? log('drive-bg', 'Upload success', { link: json.driveLink })
      : logError('drive-bg', 'Upload failed', { error: json?.error })
  } catch (err) { logError('drive-bg', 'Upload error (non-fatal)', err) }
}

async function sendEmailsInBackground(formData, paymentInfo, pdfBase64, filename, registrationNo) {
  const fromEmail  = process.env.FROM_EMAIL
  const adminEmail = process.env.ADMIN_EMAIL

  if (!fromEmail || !process.env.BREVO_SMTP_USER || !process.env.BREVO_SMTP_KEY) {
    log('email-bg', 'Email env vars missing — skipping', {
      FROM_EMAIL:      !!process.env.FROM_EMAIL,
      BREVO_SMTP_USER: !!process.env.BREVO_SMTP_USER,
      BREVO_SMTP_KEY:  !!process.env.BREVO_SMTP_KEY,
    })
    return
  }

  try {
    const transporter   = createTransporter()
    const amountDisplay = formData.category === 'General' ? 'Rs. 1,100' : 'Rs. 1,000'
    const utr           = paymentInfo?.utrNumber     || '—'
    const payMethod     = paymentInfo?.paymentMethod || 'UPI'
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
            ${[
              ['Registration No.',     registrationNo],
              ['Post Applied',         formData.postTitle],
              ['Payment Method',       payMethod],
              ['UTR / Transaction ID', utr],
              ['Payment Date / Time',  `${payDate} at ${payTime}`],
              ['Amount',               amountDisplay],
              ['Aadhar (masked)',       maskAadhar(formData.aadhar)],
              ['Status',               '⏳ Under Review'],
            ].map(([label, value], i) => `
              <tr style="${i % 2 === 0 ? 'background:#f0f7f0' : ''}">
                <td style="padding:8px 12px;font-weight:bold;color:#1a5c2a;width:45%">${label}</td>
                <td style="padding:8px 12px">${value}</td>
              </tr>
            `).join('')}
          </table>
          <p>Application PDF is attached to this email.</p>
        </div>
      </div>`

    await transporter.sendMail({
      from:        `"Rural Welfare Program" <${fromEmail}>`,
      to:          formData.email,
      subject:     `Application Submitted — ${formData.postTitle} — Reg. ${registrationNo}`,
      html:        htmlBody,
      attachments: [{ filename, content: pdfBuffer, contentType: 'application/pdf' }],
    })
    log('email-bg', 'Applicant email sent', { to: formData.email })

    if (adminEmail) {
      const adminHtml = htmlBody.replace(maskAadhar(formData.aadhar), String(formData.aadhar || ''))
      await transporter.sendMail({
        from:        `"Rural Welfare Program" <${fromEmail}>`,
        to:          adminEmail,
        subject:     `[NEW] ${formData.name} — ${formData.postTitle} — ${registrationNo} — UTR: ${utr}`,
        html:        adminHtml,
        attachments: [{ filename, content: pdfBuffer, contentType: 'application/pdf' }],
      })
      log('email-bg', 'Admin email sent', { to: adminEmail })
    }
  } catch (err) { logError('email-bg', 'Email failed (non-fatal)', err) }
}

// ── MAIN HANDLER ──────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  const allowedOrigin = process.env.ALLOWED_ORIGIN || '*'
  res.setHeader('Access-Control-Allow-Origin',  allowedOrigin)
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' })

  log('handler', 'Request received', { method: req.method, contentLength: req.headers['content-length'] })

  // ── STAGE 1: Env check ────────────────────────────────────────────────────
  const envStatus = {
    APPS_SCRIPT_URL: !!(process.env.APPS_SCRIPT_URL || process.env.VITE_APPS_SCRIPT_URL),
    BREVO_SMTP_USER: !!process.env.BREVO_SMTP_USER,
    BREVO_SMTP_KEY:  !!process.env.BREVO_SMTP_KEY,
    FROM_EMAIL:      !!process.env.FROM_EMAIL,
    ADMIN_EMAIL:     !!process.env.ADMIN_EMAIL,
    ALLOWED_ORIGIN:  !!process.env.ALLOWED_ORIGIN,
  }
  log('handler', 'Env check', envStatus)

  try {
    // ── STAGE 2: Parse body ────────────────────────────────────────────────
    log('handler', 'Parsing request body...')
    const body = req.body

    if (!body) {
      logError('handler', 'Body is null/undefined', null)
      return res.status(400).json({ error: 'Request body empty hai' })
    }

    const { formData, paymentInfo, uploadedFiles } = body

    log('handler', 'Body parsed', {
      hasFormData:     !!formData,
      hasPaymentInfo:  !!paymentInfo,
      hasUploadedFiles: !!uploadedFiles,
      fileKeys:        uploadedFiles ? Object.keys(uploadedFiles).filter(k => !!uploadedFiles[k]) : [],
      approxPayloadKB: Math.round(JSON.stringify(body).length / 1024),
    })

    // ── STAGE 3: Validation ────────────────────────────────────────────────
    if (!formData?.name || !formData?.email) {
      log('handler', 'Validation failed', { name: !!formData?.name, email: !!formData?.email })
      return res.status(400).json({ error: 'Missing required fields: name aur email zaroori hain' })
    }

    log('handler', 'Validation passed', { name: formData.name, email: formData.email })

    // ── STAGE 4: base64 → buffer ───────────────────────────────────────────
    log('handler', 'Converting base64 files to buffers...')
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
    log('handler', 'Files converted', {
      convertedKeys: Object.keys(filesForPDF).filter(k => !!filesForPDF[k]),
    })

    // ── STAGE 5: Apps Script ───────────────────────────────────────────────
    log('handler', 'Calling Apps Script for registrationNo...')
    let scriptResult
    try {
      scriptResult = await submitToAppsScript({
        name:          formData.name,
        fatherName:    formData.fatherName    || '',
        motherName:    formData.motherName    || '',
        dob:           formData.dob           || '',
        mobile:        formData.mobile        || '',
        email:         formData.email,
        gender:        formData.gender        || '',
        category:      formData.category      || '',
        nationality:   formData.nationality   || 'Indian',
        qualification: formData.qualification || '',
        aadhar:        formData.aadhar        || '',
        state:         formData.state         || '',
        district:      formData.district      || '',
        block:         formData.block         || '',
        pincode:       formData.pincode       || '',
        address:       formData.address       || '',
        bankAccountNo: formData.bankAccountNo || '',
        bankIfsc:      formData.bankIfsc      || '',
        bankName:      formData.bankName      || '',
        postTitle:     formData.postTitle     || '',
        postLevel:     formData.postLevel     || '',
        paymentMethod: paymentInfo?.paymentMethod || 'UPI',
        transactionId: paymentInfo?.utrNumber     || '',
        senderName:    paymentInfo?.senderName    || '',
        senderUpiId:   paymentInfo?.senderUpiId   || '',
        paymentDate:   paymentInfo?.paymentDate   || '',
        paymentTime:   paymentInfo?.paymentTime   || '',
        education:     formData.education         || '[]',
        hasScreenshot: !!uploadedFiles?.screenshot,
        hasBankPassbook: !!uploadedFiles?.bankPassbook,
      })
    } catch (scriptErr) {
      logError('handler', 'submitToAppsScript threw unexpectedly', scriptErr)
      return res.status(500).json({ error: 'Apps Script call failed. Please try again.' })
    }

    const registrationNo = scriptResult?.registrationNo
    if (!registrationNo) {
      log('handler', 'registrationNo missing', { scriptResult })
      return res.status(500).json({ error: 'Registration number generate nahi hua. Please try again.' })
    }
    log('handler', 'Got registrationNo', { registrationNo })

    // ── STAGE 6: PDF generation ────────────────────────────────────────────
    log('handler', 'Starting PDF generation...')
    const pdfFormData = {
      ...formData,
      registrationNo,
      paymentMethod: paymentInfo?.paymentMethod  || 'UPI',
      utrNumber:     paymentInfo?.utrNumber      || '—',
      senderName:    paymentInfo?.senderName     || '',
      senderUpiId:   paymentInfo?.senderUpiId    || '',
      paymentStatus: 'Under Review',
      paymentDate:   paymentInfo?.paymentDate    || '',
      paymentTime:   paymentInfo?.paymentTime    || '',
    }

    let pdfBytes
    try {
      pdfBytes = await generateApplicationPDF(pdfFormData, registrationNo, filesForPDF)
      log('handler', 'PDF generated', { sizeBytes: pdfBytes.length })
    } catch (pdfErr) {
      logError('handler', 'PDF generation failed', pdfErr)
      return res.status(500).json({ error: 'PDF generation failed: ' + pdfErr.message })
    }

    const pdfBase64 = Buffer.from(pdfBytes).toString('base64')
    const safeName  = (formData.name || 'applicant').replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 30)
    const filename  = `Application_${safeName}_${registrationNo}.pdf`

    // ── STAGE 7: Send response ─────────────────────────────────────────────
    log('handler', 'Sending 200 response', { registrationNo, filename })
    res.status(200).json({ success: true, pdfBase64, filename, driveLink: null, registrationNo })

    // ── STAGE 8: Background tasks ──────────────────────────────────────────
    log('handler', 'Starting background tasks...')
    uploadPDFInBackground(pdfBase64, registrationNo, formData.name)
      .catch(err => logError('drive-bg', 'Unhandled rejection', err))
    sendEmailsInBackground(formData, paymentInfo || {}, pdfBase64, filename, registrationNo)
      .catch(err => logError('email-bg', 'Unhandled rejection', err))

  } catch (error) {
    logError('handler', 'Unexpected top-level error', error)
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Server error. Please try again.' })
    }
  }
}