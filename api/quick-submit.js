// api/quick-submit.js
// ✅ FAST ENDPOINT — Sirf sheet mein entry karo aur registrationNo return karo
// ✅ PDF, email, Drive — sab background mein hote hain (process-application.js)
// ✅ Frontend ko ~2-4 seconds mein response milta hai

export const config = {
  api: {
    bodyParser:    { sizeLimit: '30mb' }, // files bhi aa rahi hain background ke liye
    responseLimit: '1mb',                 // response sirf registrationNo hai — chhota
  },
}

// ── Apps Script — sirf sheet entry + registrationNo generate ─────────────────
async function registerInSheet(payload) {
  const url = process.env.APPS_SCRIPT_URL || process.env.VITE_APPS_SCRIPT_URL
  if (!url) {
    console.warn('[quick-submit] APPS_SCRIPT_URL not set — skipping sheet entry')
    // Dev mode mein fake registrationNo generate karo
    const fakeReg = 'DEV' + Date.now().toString().slice(-8)
    return { success: true, registrationNo: fakeReg }
  }

  try {
    const res = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action: 'submit', ...payload }),
    })

    const text = await res.text()
    console.log('[quick-submit] Apps Script response:', text.substring(0, 200))

    let json
    try { json = JSON.parse(text) } catch {
      console.error('[quick-submit] Invalid JSON from Apps Script:', text)
      return { success: false, registrationNo: null }
    }

    if (!json.success) {
      console.error('[quick-submit] Apps Script error:', json.error)
    }

    return json
  } catch (err) {
    console.error('[quick-submit] Apps Script fetch failed:', err.message)
    return { success: false, registrationNo: null }
  }
}

// ── Background processing — fire and forget ───────────────────────────────────
// PDF, email, Drive sab yahan hota hai — frontend wait nahi karta
function triggerBackgroundProcessing(payload) {
  const processUrl = process.env.PROCESS_APPLICATION_URL
    || `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : process.env.BACKEND_URL || ''}/api/process-application`

  if (!processUrl || processUrl === '/api/process-application') {
    console.warn('[quick-submit] PROCESS_APPLICATION_URL not set — background job skipped')
    return
  }

  // Fire and forget — await nahi karo, catch karo silently
  fetch(processUrl, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  })
    .then(async (r) => {
      const text = await r.text().catch(() => '')
      if (!r.ok) {
        console.error('[quick-submit] Background processing failed:', r.status, text.substring(0, 200))
      } else {
        console.log('[quick-submit] Background processing started ✅')
      }
    })
    .catch((err) => {
      // Non-fatal — user ko already success page dikh gaya hai
      console.error('[quick-submit] Background trigger error (non-fatal):', err.message)
    })
}

// ── MAIN HANDLER ──────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  const allowedOrigin = process.env.ALLOWED_ORIGIN || '*'
  res.setHeader('Access-Control-Allow-Origin',  allowedOrigin)
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' })

  console.log('[quick-submit] Request received')

  try {
    const { formData, paymentInfo, uploadedFiles } = req.body

    // ── Basic validation ──
    if (!formData?.name || !formData?.email) {
      return res.status(400).json({ error: 'Missing required fields: name aur email zaroori hain' })
    }
    if (!paymentInfo?.utrNumber) {
      return res.status(400).json({ error: 'Missing UTR / Transaction ID' })
    }

    console.log('[quick-submit] Validated | applicant:', formData.name)

    // ── Sheet mein entry karo — registrationNo lo ──
    const scriptResult = await registerInSheet({
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
      state:             formData.state             || '',
      district:          formData.district          || '',
      block:             formData.block             || '',
      pincode:           formData.pincode           || '',
      address:           formData.address           || '',
      bankAccountNo:     formData.bankAccountNo     || '',
      bankIfsc:          formData.bankIfsc          || '',
      bankName:          formData.bankName          || '',
      postTitle:         formData.postTitle         || '',
      postLevel:         formData.postLevel         || '',
      paymentMethod:     paymentInfo?.paymentMethod || 'UPI',
      transactionId:     paymentInfo?.utrNumber     || '',
      senderName:        paymentInfo?.senderName        || '',
      senderUpiId:       paymentInfo?.senderUpiId       || '',
      accountHolderName: paymentInfo?.accountHolderName || '',
      lastFourDigits:    paymentInfo?.lastFourDigits    || '',
      paymentDate:       paymentInfo?.paymentDate       || '',
      paymentTime:       paymentInfo?.paymentTime       || '',
      education:         formData.education         || '[]',
      hasScreenshot:     !!uploadedFiles?.screenshot,
      hasBankPassbook:   !!uploadedFiles?.bankPassbook,
      paymentStatus:     'Under Review',
    })

    const registrationNo = scriptResult?.registrationNo

    if (!registrationNo) {
      console.error('[quick-submit] registrationNo missing from Apps Script response')
      return res.status(500).json({
        error: 'Registration number generate nahi hua. Kuch der baad try karein.',
      })
    }

    console.log('[quick-submit] Registration successful | regNo:', registrationNo)

    // ── Background mein PDF + email + Drive trigger karo ──
    // Ye fire-and-forget hai — user ko wait nahi karna
    triggerBackgroundProcessing({
      formData,
      paymentInfo,
      uploadedFiles,
      registrationNo, // already generate hua hai
    })

    // ── Turant response bhejo — registration confirmed ──
    return res.status(200).json({
      success:        true,
      registrationNo,
      pdfBase64:      null,   // background mein generate hoga
      driveLink:      null,   // background mein upload hoga
      message:        'Application registered successfully. PDF aur confirmation email kuch minutes mein aayega.',
    })

  } catch (error) {
    console.error('[quick-submit] Unexpected error:', error)
    return res.status(500).json({ error: 'Server error. Please try again.' })
  }
}