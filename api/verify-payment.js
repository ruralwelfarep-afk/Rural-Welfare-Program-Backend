// import nodemailer from 'nodemailer'
// import { generateApplicationPDF } from './utils/generatePDF.js'

// export const config = {
//   api: {
//     bodyParser:    { sizeLimit: '25mb' },
//     responseLimit: '10mb',
//   },
// }

// function log(stage, msg, data = null) {
//   const entry = { ts: new Date().toISOString(), stage, msg, ...(data !== null ? { data } : {}) }
//   console.log(JSON.stringify(entry))
// }

// function logError(stage, msg, err) {
//   console.error(JSON.stringify({
//     ts:    new Date().toISOString(),
//     stage, msg,
//     error: err?.message || String(err),
//     stack: err?.stack?.split('\n').slice(0, 6).join(' | ') || null,
//   }))
// }

// function createTransporter() {
//   return nodemailer.createTransport({
//     host: 'smtp-relay.brevo.com', port: 587, secure: false,
//     auth: { user: process.env.BREVO_SMTP_USER, pass: process.env.BREVO_SMTP_KEY },
//   })
// }

// function base64ToFileObj(fileObj) {
//   if (!fileObj?.base64) return null
//   try {
//     return {
//       buffer:       Buffer.from(fileObj.base64, 'base64'),
//       mimetype:     fileObj.mimetype     || 'image/jpeg',
//       originalName: fileObj.originalName || 'file',
//     }
//   } catch (e) {
//     logError('base64ToFileObj', 'Conversion failed', e)
//     return null
//   }
// }

// function maskAadhar(aadhar) {
//   return aadhar ? 'XXXX-XXXX-' + String(aadhar).slice(-4) : '—'
// }

// async function submitToAppsScript(payload) {
//   const url = process.env.APPS_SCRIPT_URL || process.env.VITE_APPS_SCRIPT_URL
//   if (!url) {
//     log('apps-script', 'URL not set — skipping', { envKeys: Object.keys(process.env).filter(k => k.includes('SCRIPT')) })
//     return { success: false, driveLink: null, registrationNo: null }
//   }
//   log('apps-script', 'Calling Apps Script', { url: url.slice(0, 60) + '...' })
//   try {
//     const res  = await fetch(url, {
//       method: 'POST', headers: { 'Content-Type': 'application/json' },
//       body:   JSON.stringify({ action: 'submit', ...payload }),
//     })
//     log('apps-script', 'Response received', { status: res.status, ok: res.ok })
//     const text = await res.text()
//     log('apps-script', 'Raw response', { preview: text.slice(0, 200) })
//     let json
//     try { json = JSON.parse(text) }
//     catch (parseErr) { logError('apps-script', 'JSON parse failed', parseErr); return { driveLink: null, registrationNo: null } }
//     if (!json.success) log('apps-script', 'Script returned failure', { error: json.error })
//     else log('apps-script', 'Success', { registrationNo: json.registrationNo })
//     return json
//   } catch (err) {
//     logError('apps-script', 'Fetch threw', err)
//     return { driveLink: null, registrationNo: null }
//   }
// }

// // ── Background: Drive upload ──────────────────────────────────────────────────
// async function uploadPDFInBackground(pdfBase64, registrationNo, name) {
//   const url = process.env.APPS_SCRIPT_URL || process.env.VITE_APPS_SCRIPT_URL
//   if (!url) return
//   try {
//     const res  = await fetch(url, {
//       method: 'POST', headers: { 'Content-Type': 'application/json' },
//       body:   JSON.stringify({ action: 'uploadPDF', registrationNo, name, pdfBase64 }),
//     })
//     const text = await res.text()
//     let json; try { json = JSON.parse(text) } catch { return }
//     json?.driveLink
//       ? log('drive-bg', 'Upload success', { link: json.driveLink })
//       : logError('drive-bg', 'Upload failed', { error: json?.error })
//   } catch (err) { logError('drive-bg', 'Upload error (non-fatal)', err) }
// }

// // ── Background: Email ─────────────────────────────────────────────────────────
// async function sendEmailsInBackground(formData, paymentInfo, pdfBase64, filename, registrationNo) {
//   const fromEmail  = process.env.FROM_EMAIL
//   const adminEmail = process.env.ADMIN_EMAIL

//   if (!fromEmail || !process.env.BREVO_SMTP_USER || !process.env.BREVO_SMTP_KEY) {
//     log('email-bg', 'Email env vars missing — skipping', {
//       FROM_EMAIL:      !!process.env.FROM_EMAIL,
//       BREVO_SMTP_USER: !!process.env.BREVO_SMTP_USER,
//       BREVO_SMTP_KEY:  !!process.env.BREVO_SMTP_KEY,
//     })
//     return
//   }

//   try {
//     const transporter   = createTransporter()
//     const amountDisplay = formData.category === 'General' ? 'Rs. 1,100' : 'Rs. 1,000'
//     const utr           = paymentInfo?.utrNumber     || '—'
//     const payMethod     = paymentInfo?.paymentMethod || 'UPI'
//     const payDate       = paymentInfo?.paymentDate   || '—'
//     const payTime       = paymentInfo?.paymentTime   || '—'
//     const pdfBuffer     = Buffer.from(pdfBase64, 'base64')

//     const htmlBody = `
//       <div style="font-family:sans-serif;max-width:600px;margin:auto">
//         <div style="background:#1a5c2a;padding:24px;border-radius:12px 12px 0 0">
//           <h2 style="color:white;margin:0">Rural Welfare Program</h2>
//           <p style="color:#f0c020;margin:4px 0 0">Application Submitted Successfully</p>
//         </div>
//         <div style="padding:24px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 12px 12px">
//           <p>Dear <strong>${formData.name}</strong>,</p>
//           <p>Your application for <strong>${formData.postTitle}</strong> has been submitted.</p>
//           <div style="background:#fff3cd;border:1px solid #ffc107;border-radius:8px;padding:12px;font-size:13px;margin:16px 0">
//             ⏳ <strong>Payment Status: Under Review</strong><br/>
//             Your payment will be verified within 24 hours.
//           </div>
//           <table style="width:100%;border-collapse:collapse;font-size:14px;margin:16px 0">
//             ${[
//               ['Registration No.',     registrationNo],
//               ['Post Applied',         formData.postTitle],
//               ['Payment Method',       payMethod],
//               ['UTR / Transaction ID', utr],
//               ['Payment Date / Time',  `${payDate} at ${payTime}`],
//               ['Amount',               amountDisplay],
//               ['Aadhar (masked)',       maskAadhar(formData.aadhar)],
//               ['Status',               '⏳ Under Review'],
//             ].map(([label, value], i) => `
//               <tr style="${i % 2 === 0 ? 'background:#f0f7f0' : ''}">
//                 <td style="padding:8px 12px;font-weight:bold;color:#1a5c2a;width:45%">${label}</td>
//                 <td style="padding:8px 12px">${value}</td>
//               </tr>
//             `).join('')}
//           </table>
//           <p>Application PDF is attached to this email.</p>
//         </div>
//       </div>`

//     await transporter.sendMail({
//       from:        `"Rural Welfare Program" <${fromEmail}>`,
//       to:          formData.email,
//       subject:     `Application Submitted — ${formData.postTitle} — Reg. ${registrationNo}`,
//       html:        htmlBody,
//       attachments: [{ filename, content: pdfBuffer, contentType: 'application/pdf' }],
//     })
//     log('email-bg', 'Applicant email sent', { to: formData.email })

//     if (adminEmail) {
//       const adminHtml = htmlBody.replace(maskAadhar(formData.aadhar), String(formData.aadhar || ''))
//       await transporter.sendMail({
//         from:        `"Rural Welfare Program" <${fromEmail}>`,
//         to:          adminEmail,
//         subject:     `[NEW] ${formData.name} — ${formData.postTitle} — ${registrationNo} — UTR: ${utr}`,
//         html:        adminHtml,
//         attachments: [{ filename, content: pdfBuffer, contentType: 'application/pdf' }],
//       })
//       log('email-bg', 'Admin email sent', { to: adminEmail })
//     }
//   } catch (err) { logError('email-bg', 'Email failed (non-fatal)', err) }
// }

// // ── MAIN HANDLER ──────────────────────────────────────────────────────────────
// export default async function handler(req, res) {
//   const allowedOrigin = process.env.ALLOWED_ORIGIN || '*'
//   res.setHeader('Access-Control-Allow-Origin',  allowedOrigin)
//   res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
//   res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
//   if (req.method === 'OPTIONS') return res.status(200).end()
//   if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' })

//   log('handler', 'Request received', { method: req.method, contentLength: req.headers['content-length'] })

//   const envStatus = {
//     APPS_SCRIPT_URL: !!(process.env.APPS_SCRIPT_URL || process.env.VITE_APPS_SCRIPT_URL),
//     BREVO_SMTP_USER: !!process.env.BREVO_SMTP_USER,
//     BREVO_SMTP_KEY:  !!process.env.BREVO_SMTP_KEY,
//     FROM_EMAIL:      !!process.env.FROM_EMAIL,
//     ADMIN_EMAIL:     !!process.env.ADMIN_EMAIL,
//     ALLOWED_ORIGIN:  !!process.env.ALLOWED_ORIGIN,
//   }
//   log('handler', 'Env check', envStatus)

//   try {
//     log('handler', 'Parsing request body...')
//     const body = req.body

//     if (!body) {
//       logError('handler', 'Body is null/undefined', null)
//       return res.status(400).json({ error: 'Request body empty hai' })
//     }

//     const { formData, paymentInfo, uploadedFiles } = body

//     log('handler', 'Body parsed', {
//       hasFormData:      !!formData,
//       hasPaymentInfo:   !!paymentInfo,
//       hasUploadedFiles: !!uploadedFiles,
//       fileKeys:         uploadedFiles ? Object.keys(uploadedFiles).filter(k => !!uploadedFiles[k]) : [],
//       approxPayloadKB:  Math.round(JSON.stringify(body).length / 1024),
//     })

//     if (!formData?.name || !formData?.email) {
//       log('handler', 'Validation failed', { name: !!formData?.name, email: !!formData?.email })
//       return res.status(400).json({ error: 'Missing required fields: name aur email zaroori hain' })
//     }
//     log('handler', 'Validation passed', { name: formData.name, email: formData.email })

//     log('handler', 'Converting base64 files to buffers...')
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
//     log('handler', 'Files converted', { convertedKeys: Object.keys(filesForPDF).filter(k => !!filesForPDF[k]) })

//     log('handler', 'Calling Apps Script for registrationNo...')
//     let scriptResult
//     try {
//       scriptResult = await submitToAppsScript({
//         name:           formData.name,
//         fatherName:     formData.fatherName    || '',
//         motherName:     formData.motherName    || '',
//         dob:            formData.dob           || '',
//         mobile:         formData.mobile        || '',
//         email:          formData.email,
//         gender:         formData.gender        || '',
//         category:       formData.category      || '',
//         nationality:    formData.nationality   || 'Indian',
//         qualification:  formData.qualification || '',
//         aadhar:         formData.aadhar        || '',
//         state:          formData.state         || '',
//         district:       formData.district      || '',
//         block:          formData.block         || '',
//         pincode:        formData.pincode       || '',
//         address:        formData.address       || '',
//         bankAccountNo:  formData.bankAccountNo || '',
//         bankIfsc:       formData.bankIfsc      || '',
//         bankName:       formData.bankName      || '',
//         postTitle:      formData.postTitle     || '',
//         postLevel:      formData.postLevel     || '',
//         paymentMethod:  paymentInfo?.paymentMethod || 'UPI',
//         transactionId:  paymentInfo?.utrNumber     || '',
//         senderName:     paymentInfo?.senderName    || '',
//         senderUpiId:    paymentInfo?.senderUpiId   || '',
//         paymentDate:    paymentInfo?.paymentDate   || '',
//         paymentTime:    paymentInfo?.paymentTime   || '',
//         education:      formData.education         || '[]',
//         hasScreenshot:  !!uploadedFiles?.screenshot,
//         hasBankPassbook: !!uploadedFiles?.bankPassbook,
//       })
//     } catch (scriptErr) {
//       logError('handler', 'submitToAppsScript threw unexpectedly', scriptErr)
//       return res.status(500).json({ error: 'Apps Script call failed. Please try again.' })
//     }

//     const registrationNo = scriptResult?.registrationNo
//     if (!registrationNo) {
//       log('handler', 'registrationNo missing', { scriptResult })
//       return res.status(500).json({ error: 'Registration number generate nahi hua. Please try again.' })
//     }
//     log('handler', 'Got registrationNo', { registrationNo })

//     log('handler', 'Starting PDF generation...')
//     const pdfFormData = {
//       ...formData,
//       registrationNo,
//       paymentMethod: paymentInfo?.paymentMethod || 'UPI',
//       utrNumber:     paymentInfo?.utrNumber     || '—',
//       senderName:    paymentInfo?.senderName    || '',
//       senderUpiId:   paymentInfo?.senderUpiId   || '',
//       paymentStatus: 'Under Review',
//       paymentDate:   paymentInfo?.paymentDate   || '',
//       paymentTime:   paymentInfo?.paymentTime   || '',
//     }

//     let pdfBytes
//     try {
//       pdfBytes = await generateApplicationPDF(pdfFormData, registrationNo, filesForPDF)
//       log('handler', 'PDF generated', { sizeBytes: pdfBytes.length })
//     } catch (pdfErr) {
//       logError('handler', 'PDF generation failed', pdfErr)
//       return res.status(500).json({ error: 'PDF generation failed: ' + pdfErr.message })
//     }

//     const pdfBase64 = Buffer.from(pdfBytes).toString('base64')
//     const safeName  = (formData.name || 'applicant').replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 30)
//     const filename  = `Application_${safeName}_${registrationNo}.pdf`

//     // ✅ PEHLE response bhejo — user ko turant PDF mil jaye
//     log('handler', 'Sending 200 response — email/drive will continue in background', { registrationNo, filename })
//     res.status(200).json({ success: true, pdfBase64, filename, driveLink: null, registrationNo })

//     // ✅ Response ke BAAD background me email + drive — user wait nahi karega
//     setImmediate(() => {
//       sendEmailsInBackground(formData, paymentInfo || {}, pdfBase64, filename, registrationNo)
//         .catch(err => logError('email-bg', 'Unhandled rejection', err))

//       uploadPDFInBackground(pdfBase64, registrationNo, formData.name)
//         .catch(err => logError('drive-bg', 'Unhandled rejection', err))
//     })

//   } catch (error) {
//     logError('handler', 'Unexpected top-level error', error)
//     if (!res.headersSent) {
//       return res.status(500).json({ error: 'Server error. Please try again.' })
//     }
//   }
// }










import { generateApplicationPDF } from './utils/generatePDF.js'

export const config = {
  api: {
    bodyParser:    { sizeLimit: '25mb' },
    responseLimit: '10mb',
  },
}

function log(stage, msg, data = null) {
  const entry = { ts: new Date().toISOString(), stage, msg, ...(data !== null ? { data } : {}) }
  console.log(JSON.stringify(entry))
}

function logError(stage, msg, err) {
  console.error(JSON.stringify({
    ts:    new Date().toISOString(),
    stage, msg,
    error: err?.message || String(err),
    stack: err?.stack?.split('\n').slice(0, 6).join(' | ') || null,
  }))
}

// ── ✅ FIXED: Brevo HTTP API instead of SMTP (SMTP times out on Render free tier) ──
async function sendViaBrevoAPI(to, subject, htmlBody, attachments = []) {
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) {
    log('email-bg', 'BREVO_API_KEY not set — skipping')
    return false
  }

  const payload = {
    sender:      { name: 'Rural Welfare Program', email: process.env.FROM_EMAIL },
    to:          [{ email: to }],
    subject,
    htmlContent: htmlBody,
    attachment:  attachments.map(a => ({
      name:    a.filename,
      content: a.content.toString('base64'),
    })),
  }

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key':      apiKey,
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`Brevo API error: ${res.status} — ${errText.slice(0, 200)}`)
  }

  return true
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

// ✅ FIXED: Retry logic added — Apps Script kabhi kabhi 1st attempt pe fail ho jaata hai
async function submitToAppsScript(payload, retries = 3) {
  const url = process.env.APPS_SCRIPT_URL || process.env.VITE_APPS_SCRIPT_URL
  if (!url) {
    log('apps-script', 'URL not set — skipping', { envKeys: Object.keys(process.env).filter(k => k.includes('SCRIPT')) })
    return { success: false, driveLink: null, registrationNo: null }
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    log('apps-script', `Attempt ${attempt}/${retries}`, { url: url.slice(0, 60) + '...' })
    try {
      // ✅ 25s timeout per attempt — Apps Script slow hota hai kabhi
      const controller = new AbortController()
      const timeoutId  = setTimeout(() => controller.abort(), 25000)

      const res = await fetch(url, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action: 'submit', ...payload }),
        signal:  controller.signal,
      })
      clearTimeout(timeoutId)

      log('apps-script', 'Response received', { status: res.status, ok: res.ok })
      const text = await res.text()
      log('apps-script', 'Raw response', { preview: text.slice(0, 200) })

      let json
      try { json = JSON.parse(text) }
      catch (parseErr) {
        logError('apps-script', `JSON parse failed on attempt ${attempt}`, parseErr)
        if (attempt < retries) { await new Promise(r => setTimeout(r, 1500 * attempt)); continue }
        return { driveLink: null, registrationNo: null }
      }

      if (!json.success || !json.registrationNo) {
        log('apps-script', `No registrationNo on attempt ${attempt}`, { error: json.error, json })
        if (attempt < retries) { await new Promise(r => setTimeout(r, 1500 * attempt)); continue }
        return { driveLink: null, registrationNo: null }
      }

      log('apps-script', 'Success', { registrationNo: json.registrationNo })
      return json

    } catch (err) {
      const isAbort = err.name === 'AbortError'
      logError('apps-script', `Attempt ${attempt} failed${isAbort ? ' (timeout)' : ''}`, err)
      if (attempt < retries) { await new Promise(r => setTimeout(r, 1500 * attempt)); continue }
      return { driveLink: null, registrationNo: null }
    }
  }

  return { driveLink: null, registrationNo: null }
}

// ── Background: Drive upload ──────────────────────────────────────────────────
async function uploadPDFInBackground(pdfBase64, registrationNo, name) {
  const url = process.env.APPS_SCRIPT_URL || process.env.VITE_APPS_SCRIPT_URL
  if (!url) return
  try {
    const controller = new AbortController()
    const timeoutId  = setTimeout(() => controller.abort(), 30000)
    const res        = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action: 'uploadPDF', registrationNo, name, pdfBase64 }),
      signal:  controller.signal,
    })
    clearTimeout(timeoutId)
    const text = await res.text()
    let json; try { json = JSON.parse(text) } catch { return }
    json?.driveLink
      ? log('drive-bg', 'Upload success', { link: json.driveLink })
      : logError('drive-bg', 'Upload failed', { error: json?.error })
  } catch (err) { logError('drive-bg', 'Upload error (non-fatal)', err) }
}

// ── Background: Email via Brevo HTTP API ─────────────────────────────────────
async function sendEmailsInBackground(formData, paymentInfo, pdfBase64, filename, registrationNo) {
  const fromEmail  = process.env.FROM_EMAIL
  const adminEmail = process.env.ADMIN_EMAIL

  // ✅ FIXED: BREVO_API_KEY check (not SMTP vars)
  if (!fromEmail || !process.env.BREVO_API_KEY) {
    log('email-bg', 'Email env vars missing — skipping', {
      FROM_EMAIL:    !!process.env.FROM_EMAIL,
      BREVO_API_KEY: !!process.env.BREVO_API_KEY,
    })
    return
  }

  try {
    const amountDisplay = formData.category === 'General' ? 'Rs. 1,100' : 'Rs. 1,000'
    const utr           = paymentInfo?.utrNumber     || '—'
    const payMethod     = paymentInfo?.paymentMethod || 'UPI'
    const payDate       = paymentInfo?.paymentDate   || '—'
    const payTime       = paymentInfo?.paymentTime   || '—'
    const pdfBuffer     = Buffer.from(pdfBase64, 'base64')

    const tableRows = [
      ['Registration No.',     registrationNo],
      ['Post Applied',         formData.postTitle],
      ['Payment Method',       payMethod],
      ['UTR / Transaction ID', utr],
      ['Payment Date / Time',  `${payDate} at ${payTime}`],
      ['Amount',               amountDisplay],
      ['Aadhar (masked)',       maskAadhar(formData.aadhar)],
      ['Status',               '⏳ Under Review'],
    ]

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
            ${tableRows.map(([label, value], i) => `
              <tr style="${i % 2 === 0 ? 'background:#f0f7f0' : ''}">
                <td style="padding:8px 12px;font-weight:bold;color:#1a5c2a;width:45%">${label}</td>
                <td style="padding:8px 12px">${value}</td>
              </tr>
            `).join('')}
          </table>
          <p>Application PDF is attached to this email.</p>
        </div>
      </div>`

    const attachments = [{ filename, content: pdfBuffer, contentType: 'application/pdf' }]

    await sendViaBrevoAPI(
      formData.email,
      `Application Submitted — ${formData.postTitle} — Reg. ${registrationNo}`,
      htmlBody,
      attachments,
    )
    log('email-bg', 'Applicant email sent via Brevo API', { to: formData.email })

    if (adminEmail) {
      const adminHtml = htmlBody.replace(maskAadhar(formData.aadhar), String(formData.aadhar || ''))
      await sendViaBrevoAPI(
        adminEmail,
        `[NEW] ${formData.name} — ${formData.postTitle} — ${registrationNo} — UTR: ${utr}`,
        adminHtml,
        attachments,
      )
      log('email-bg', 'Admin email sent via Brevo API', { to: adminEmail })
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

  const envStatus = {
    APPS_SCRIPT_URL: !!(process.env.APPS_SCRIPT_URL || process.env.VITE_APPS_SCRIPT_URL),
    BREVO_API_KEY:   !!process.env.BREVO_API_KEY,
    FROM_EMAIL:      !!process.env.FROM_EMAIL,
    ADMIN_EMAIL:     !!process.env.ADMIN_EMAIL,
    ALLOWED_ORIGIN:  !!process.env.ALLOWED_ORIGIN,
  }
  log('handler', 'Env check', envStatus)

  try {
    const body = req.body
    if (!body) {
      logError('handler', 'Body is null/undefined', null)
      return res.status(400).json({ error: 'Request body empty hai' })
    }

    const { formData, paymentInfo, uploadedFiles } = body

    log('handler', 'Body parsed', {
      hasFormData:      !!formData,
      hasPaymentInfo:   !!paymentInfo,
      hasUploadedFiles: !!uploadedFiles,
      fileKeys:         uploadedFiles ? Object.keys(uploadedFiles).filter(k => !!uploadedFiles[k]) : [],
      approxPayloadKB:  Math.round(JSON.stringify(body).length / 1024),
    })

    if (!formData?.name || !formData?.email) {
      return res.status(400).json({ error: 'Missing required fields: name aur email zaroori hain' })
    }

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

    log('handler', 'Calling Apps Script for registrationNo...')
    let scriptResult
    try {
      scriptResult = await submitToAppsScript({
        name:           formData.name,
        fatherName:     formData.fatherName    || '',
        motherName:     formData.motherName    || '',
        dob:            formData.dob           || '',
        mobile:         formData.mobile        || '',
        email:          formData.email,
        gender:         formData.gender        || '',
        category:       formData.category      || '',
        nationality:    formData.nationality   || 'Indian',
        qualification:  formData.qualification || '',
        aadhar:         formData.aadhar        || '',
        state:          formData.state         || '',
        district:       formData.district      || '',
        block:          formData.block         || '',
        pincode:        formData.pincode       || '',
        address:        formData.address       || '',
        bankAccountNo:  formData.bankAccountNo || '',
        bankIfsc:       formData.bankIfsc      || '',
        bankName:       formData.bankName      || '',
        postTitle:      formData.postTitle     || '',
        postLevel:      formData.postLevel     || '',
        paymentMethod:  paymentInfo?.paymentMethod || 'UPI',
        transactionId:  paymentInfo?.utrNumber     || '',
        senderName:     paymentInfo?.senderName    || '',
        senderUpiId:    paymentInfo?.senderUpiId   || '',
        paymentDate:    paymentInfo?.paymentDate   || '',
        paymentTime:    paymentInfo?.paymentTime   || '',
        education:      formData.education         || '[]',
        hasScreenshot:  !!uploadedFiles?.screenshot,
        hasBankPassbook: !!uploadedFiles?.bankPassbook,
      })
    } catch (scriptErr) {
      logError('handler', 'submitToAppsScript threw unexpectedly', scriptErr)
      return res.status(500).json({ error: 'Apps Script call failed. Please try again.' })
    }

    const registrationNo = scriptResult?.registrationNo
    if (!registrationNo) {
      log('handler', 'registrationNo missing after all retries', { scriptResult })
      return res.status(500).json({ error: 'Registration number generate nahi hua. Please try again.' })
    }
    log('handler', 'Got registrationNo', { registrationNo })

    log('handler', 'Starting PDF generation...')
    const pdfFormData = {
      ...formData,
      registrationNo,
      paymentMethod: paymentInfo?.paymentMethod || 'UPI',
      utrNumber:     paymentInfo?.utrNumber     || '—',
      senderName:    paymentInfo?.senderName    || '',
      senderUpiId:   paymentInfo?.senderUpiId   || '',
      paymentStatus: 'Under Review',
      paymentDate:   paymentInfo?.paymentDate   || '',
      paymentTime:   paymentInfo?.paymentTime   || '',
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

    log('handler', 'Sending 200 response — email/drive will continue in background', { registrationNo, filename })
    res.status(200).json({ success: true, pdfBase64, filename, driveLink: null, registrationNo })

    setImmediate(() => {
      sendEmailsInBackground(formData, paymentInfo || {}, pdfBase64, filename, registrationNo)
        .catch(err => logError('email-bg', 'Unhandled rejection', err))

      uploadPDFInBackground(pdfBase64, registrationNo, formData.name)
        .catch(err => logError('drive-bg', 'Unhandled rejection', err))
    })

  } catch (error) {
    logError('handler', 'Unexpected top-level error', error)
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Server error. Please try again.' })
    }
  }
}