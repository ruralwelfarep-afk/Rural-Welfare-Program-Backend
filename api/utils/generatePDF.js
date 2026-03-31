

// // backend/api/utils/generatePDF.js

// import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

// let existsSync, resolve, dirname, fileURLToPath
// try {
//   const fs   = await import('fs').catch(() => null)
//   const path = await import('path').catch(() => null)
//   const url  = await import('url').catch(() => null)
//   if (fs && path && url) {
//     existsSync    = fs.existsSync
//     resolve       = path.resolve
//     dirname       = path.dirname
//     fileURLToPath = url.fileURLToPath
//   }
// } catch (_) {}

// function getLogoPath() {
//   try {
//     if (!fileURLToPath || !dirname || !resolve) return null
//     const __filename = fileURLToPath(import.meta.url)
//     const __dir      = dirname(__filename)
//     return resolve(__dir, '../../public/logo.webp')
//   } catch (_) { return null }
// }

// const GREEN  = rgb(0.1,  0.36, 0.16)
// const YELLOW = rgb(0.94, 0.75, 0.13)
// const LGREEN = rgb(0.94, 0.98, 0.94)
// const GRAY   = rgb(0.4,  0.4,  0.4)
// const DGRAY  = rgb(0.15, 0.15, 0.15)
// const WHITE  = rgb(1, 1, 1)
// const RED    = rgb(0.85, 0.1, 0.1)
// const ORANGE = rgb(0.9, 0.5, 0.0)

// // ── LAYOUT CONSTANTS ──────────────────────────────────────────────────────────
// const BX     = 36
// const BWIDTH = 595 - 72
// const PAD    = 12
// const CX     = BX + PAD
// const CWIDTH = BWIDTH - PAD * 2

// function textWidth(text, size, isBold = false) {
//   return text.length * size * (isBold ? 0.56 : 0.52)
// }

// async function embedImage(pdfDoc, buffer, mimeType) {
//   if (mimeType === 'image/png') return pdfDoc.embedPng(buffer)
//   return pdfDoc.embedJpg(buffer)
// }

// function drawSectionHeader(page, fonts, y, title) {
//   page.drawRectangle({ x: BX, y: y - 4, width: BWIDTH, height: 22, color: GREEN })
//   page.drawText(title, { x: CX, y: y + 3, size: 11, font: fonts.bold, color: WHITE })
//   return y - 28
// }

// async function embedLogo(pdfDoc, page, x, y, size) {
//   try {
//     const logoPath = getLogoPath()
//     if (logoPath && existsSync && existsSync(logoPath)) {
//       const sharp   = (await import('sharp')).default
//       const pngBuf  = await sharp(logoPath).png().toBuffer()
//       const logoImg = await pdfDoc.embedPng(pngBuf)
//       page.drawImage(logoImg, { x, y, width: size, height: size })
//     }
//   } catch (_) {}
// }

// export async function generateApplicationPDF(formData, paymentId, uploadedFiles) {
//   const pdfDoc      = await PDFDocument.create()
//   const boldFont    = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
//   const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
//   const fonts       = { bold: boldFont, regular: regularFont }

//   const page = pdfDoc.addPage([595, 842])
//   const { width, height } = page.getSize()

//   // ── HEADER ────────────────────────────────────────────────────────────────────
//   const headerH = 72
//   page.drawRectangle({ x: 0, y: height - headerH, width, height: headerH, color: GREEN })

//   const logoSize = 54
//   const logoX    = 26
//   const logoY    = height - headerH + (headerH - logoSize) / 2

//   await embedLogo(pdfDoc, page, logoX, logoY, logoSize)

//   const heading    = 'RURAL WELFARE PROGRAM'
//   const subheading = 'Application Form'
//   const hSize      = 21
//   const shSize     = 16
//   const hW         = textWidth(heading, hSize, true)
//   const shW        = textWidth(subheading, shSize)
//   const HEADER_TOP_PADDING = 6
//   page.drawText(heading, {
//     x: Math.max(logoX + logoSize + 8, (width - hW) / 2),
//     y: height - headerH + 44 - HEADER_TOP_PADDING,
//     size: hSize, font: boldFont, color: WHITE,
//   })
//   page.drawText(subheading, {
//     x: (width - shW) / 2,
//     y: height - headerH + 22 - HEADER_TOP_PADDING,
//     size: shSize, font: regularFont, color: YELLOW,
//   })

//   page.drawRectangle({ x: 0, y: height - headerH - 6, width, height: 6, color: YELLOW })

//   const YELLOW_BOTTOM    = height - headerH - 6
//   const GAP_AFTER_YELLOW = 30

//   // ── POST + REG NO ─────────────────────────────────────────────────────────────
//   let y = YELLOW_BOTTOM - GAP_AFTER_YELLOW - 4
//   const ROW_H        = 22
//   const borderStartY = y + ROW_H

//   page.drawRectangle({ x: BX, y: y - 4, width: BWIDTH, height: ROW_H, color: LGREEN })
//   page.drawText('Post',             { x: CX,       y, size: 11, font: boldFont,    color: GRAY  })
//   page.drawText((formData.postTitle || '').toUpperCase(),
//                                     { x: CX + 75,  y, size: 11, font: boldFont,    color: GREEN })
//   page.drawText('Registration No.', { x: CX + 270, y, size: 11, font: boldFont,    color: GRAY  })
//   page.drawText(String(formData.registrationNo || ''),
//                                     { x: CX + 385, y, size: 11, font: boldFont,    color: GREEN })
//   y -= ROW_H + 2

//   // ── PERSONAL DETAILS ──────────────────────────────────────────────────────────
//   const PERS_FS = 10
//   const PERS_RH = 21
//   const val1X   = CX + 100
//   const col2X   = CX + 258
//   const val2X   = CX + 360

//   const personalRows = [
//     ["Student's Name",  formData.name,                    "Father's Name",  formData.fatherName],
//     ["Mother's Name",   formData.motherName,              'Date of Birth',  formData.dob],
//     ['Gender',          formData.gender,                  'Category',       formData.category],
//     ['Nationality',     formData.nationality || 'Indian', 'Mobile No.',     formData.mobile],
//     ['Aadhaar Number',  formData.aadhar,                  'Email Id',       formData.email],
//     ['State',           formData.state,                   'District',       formData.district],
//     ['Block',           formData.block || '—',            'Pincode',        formData.pincode || '—'],
//     ['Qualification',   formData.qualification,           'Reg. Date',      new Date().toLocaleDateString('en-IN')],
//     ['Address',         String(formData.address || '—').substring(0, 38),   'Status', 'SUBMITTED'],
//   ]

//   for (let i = 0; i < personalRows.length; i++) {
//     const [l1, v1, l2, v2] = personalRows[i]
//     if (i % 2 === 0) page.drawRectangle({ x: BX, y: y - 4, width: BWIDTH, height: PERS_RH, color: LGREEN })
//     page.drawText(l1,                                                         { x: CX,    y, size: PERS_FS, font: boldFont,    color: GRAY  })
//     page.drawText(String(v1 || '—').toUpperCase().substring(0, 22),           { x: val1X, y, size: PERS_FS, font: regularFont, color: DGRAY })
//     page.drawText(l2,                                                         { x: col2X, y, size: PERS_FS, font: boldFont,    color: GRAY  })
//     page.drawText(String(v2 || '—').toUpperCase().substring(0, 18),           { x: val2X, y, size: PERS_FS, font: regularFont, color: DGRAY })
//     y -= PERS_RH
//   }
//   y -= 6

//   // ── EDUCATION TABLE ───────────────────────────────────────────────────────────
//   y = drawSectionHeader(page, fonts, y, 'Education Eligibility')

//   const EDU_FS = 9
//   const EDU_RH = 18
//   const eduCols = [
//     { label: 'Sr',       x: CX       },
//     { label: 'Class',    x: CX + 18  },
//     { label: 'Roll No.', x: CX + 75  },
//     { label: 'College',  x: CX + 138 },
//     { label: 'Board',    x: CX + 268 },
//     { label: 'Year',     x: CX + 316 },
//     { label: 'Total',    x: CX + 354 },
//     { label: 'Obtained', x: CX + 394 },
//     { label: '%',        x: CX + 444 },
//   ]

//   page.drawRectangle({ x: BX, y: y - 4, width: BWIDTH, height: EDU_RH, color: rgb(0.2, 0.45, 0.25) })
//   eduCols.forEach(({ label, x }) => {
//     page.drawText(label, { x, y, size: EDU_FS, font: boldFont, color: WHITE })
//   })
//   y -= EDU_RH + 1

//   const education = JSON.parse(formData.education || '[]')
//   education.forEach((row, i) => {
//     if (i % 2 === 0) page.drawRectangle({ x: BX, y: y - 4, width: BWIDTH, height: EDU_RH, color: LGREEN })
//     const rowData = [
//       String(i + 1), row.class, row.rollEnroll || '',
//       (row.college || '').substring(0, 18),
//       row.board || '', row.year || '', row.totalMarks || '',
//       row.obtainMarks || '',
//       row.percentage ? `${row.percentage}%` : '',
//     ]
//     eduCols.forEach(({ x }, ci) => {
//       page.drawText(String(rowData[ci]), { x, y, size: EDU_FS, font: regularFont, color: DGRAY })
//     })
//     y -= EDU_RH
//   })
//   y -= 8

//   // ── BANK DETAILS ──────────────────────────────────────────────────────────────
//   y = drawSectionHeader(page, fonts, y, 'Bank Details')

//   const BANK_FS = 10
//   const BANK_RH = 21
//   const bankRows = [
//     ['Bank Account No.', formData.bankAccountNo || '—'],
//     ['IFSC Code',        formData.bankIfsc       || '—'],
//     ['Bank Name',        formData.bankName       || '—'],
//   ]

//   bankRows.forEach(([label, value], i) => {
//     if (i % 2 === 0) page.drawRectangle({ x: BX, y: y - 4, width: BWIDTH, height: BANK_RH, color: LGREEN })
//     page.drawText(label,         { x: CX + 36,  y, size: BANK_FS, font: boldFont,    color: GRAY  })
//     page.drawText(String(value), { x: CX + 220, y, size: BANK_FS, font: regularFont, color: DGRAY })
//     y -= BANK_RH
//   })
//   y -= 8

//   // ── PAYMENT DETAILS ───────────────────────────────────────────────────────────
//   y = drawSectionHeader(page, fonts, y, 'Payment Details')

//   const PAY_FS = 10
//   const PAY_RH = 21

//   const utrNumber = formData.utrNumber || formData.transactionId || '—'
//   const payMethod = formData.paymentMethod || 'Manual'
//   const amountStr = formData.category === 'General' ? 'Rs. 1,100' : 'Rs. 1,000'

//   const payDateTimeStr = [formData.paymentDate, formData.paymentTime]
//     .filter(Boolean)
//     .join(' at ') || new Date().toLocaleDateString('en-IN')

//   const statusColor = ORANGE

//   const payRows = [
//     ['Payment Method',      payMethod],
//     ['UTR / Txn. ID',       utrNumber],
//     ...(payMethod === 'UPI' && formData.senderName
//       ? [['Sender Name',    formData.senderName]]
//       : []),
//     ...(payMethod === 'UPI' && formData.senderUpiId
//       ? [['Sender UPI ID',  formData.senderUpiId]]
//       : []),
//     ...(payMethod === 'Bank Transfer' && formData.accountHolderName
//       ? [
//           ['Account Holder',    formData.accountHolderName],
//           ['Account (Last 4)',  formData.lastFourDigits ? `XXXX-${formData.lastFourDigits}` : '—'],
//         ]
//       : []),
//     ['Amount',              amountStr],
//     ['Payment Date / Time', payDateTimeStr],
//     ['Payment Status',      'Under Review'],
//   ]

//   payRows.forEach(([label, value], i) => {
//     if (i % 2 === 0) page.drawRectangle({ x: BX, y: y - 4, width: BWIDTH, height: PAY_RH, color: LGREEN })
//     page.drawText(label, { x: CX + 36,  y, size: PAY_FS, font: boldFont,    color: GRAY  })

//     if (label === 'Payment Status') {
//       page.drawText(String(value), { x: CX + 220, y, size: PAY_FS, font: boldFont, color: statusColor })
//     } else {
//       page.drawText(String(value), { x: CX + 220, y, size: PAY_FS, font: regularFont, color: DGRAY })
//     }
//     y -= PAY_RH
//   })
//   y -= 8

//   // ── UPLOADED DOCUMENTS ────────────────────────────────────────────────────────
//   y = drawSectionHeader(page, fonts, y, 'Uploaded Documents')

//   const DOC_FS = 10
//   const DOC_RH = 20
//   const allDocs = [
//     { key: 'photo',         label: 'Applicant Photo'       },
//     { key: 'signature',     label: 'Signature'             },
//     { key: 'aadharDoc',     label: 'Aadhar Card'           },
//     { key: 'bankPassbook',  label: 'Bank Passbook'         },
//     { key: 'tenthDoc',      label: '10th Class Marksheet'  },
//     { key: 'twelfthDoc',    label: '12th Class Marksheet'  },
//     { key: 'additionalDoc', label: 'Additional Document'   },
//     { key: 'screenshot',    label: 'Payment Screenshot'    },
//   ]

//   const halfCW = Math.floor(CWIDTH / 2)

//   allDocs.forEach((doc, i) => {
//     const col    = i % 2
//     const rowIdx = Math.floor(i / 2)
//     const dx     = CX + col * halfCW
//     const dy     = y - rowIdx * DOC_RH

//     if (col === 0) {
//       if (rowIdx % 2 === 0) page.drawRectangle({ x: BX, y: dy - 5, width: BWIDTH, height: DOC_RH, color: LGREEN })
//     }

//     const uploaded = !!uploadedFiles[doc.key]
//     page.drawRectangle({ x: dx, y: dy - 2, width: 28, height: 14, color: uploaded ? GREEN : RED })
//     page.drawText(uploaded ? 'YES' : 'NO', { x: dx + 4, y: dy + 1, size: 8.5, font: boldFont, color: WHITE })
//     page.drawText(doc.label, { x: dx + 32, y: dy, size: DOC_FS, font: regularFont, color: DGRAY })
//   })

//   const docRows = Math.ceil(allDocs.length / 2)
//   y -= docRows * DOC_RH + 12

//   // ── DATE / PHOTO / SIGNATURE BOXES ───────────────────────────────────────────
//   const boxH      = 95
//   const boxY      = y - boxH
//   const gap       = 3
//   const totalBoxW = BWIDTH - gap * 2
//   const dateW     = Math.floor(totalBoxW / 3)
//   const photoW    = Math.floor(totalBoxW / 3)
//   const sigW      = totalBoxW - dateW - photoW

//   const dateX  = BX
//   const photoX = dateX  + dateW  + gap
//   const sigX   = photoX + photoW + gap

//   const borderEndY = boxY

//   // DATE BOX
//   const dateStr    = new Date().toLocaleDateString('en-IN')
//   const dateFontSz = 13
//   const dateStrW   = textWidth(dateStr, dateFontSz, true)
//   page.drawRectangle({ x: dateX, y: boxY, width: dateW, height: boxH, borderColor: GREEN, borderWidth: 1, color: LGREEN })
//   page.drawRectangle({ x: dateX, y: boxY + boxH - 20, width: dateW, height: 20, color: rgb(0.2, 0.45, 0.25) })
//   page.drawText('Date', {
//     x: dateX + (dateW - textWidth('Date', 10, true)) / 2,
//     y: boxY + boxH - 14,
//     size: 10, font: boldFont, color: WHITE,
//   })
//   page.drawText(dateStr, {
//     x: dateX + (dateW - dateStrW) / 2,
//     y: boxY + (boxH - 20) / 2 - 5,
//     size: dateFontSz, font: boldFont, color: GREEN,
//   })

//   // PHOTO BOX
//   page.drawRectangle({ x: photoX, y: boxY, width: photoW, height: boxH, borderColor: GREEN, borderWidth: 1, color: LGREEN })
//   page.drawRectangle({ x: photoX, y: boxY + boxH - 20, width: photoW, height: 20, color: rgb(0.2, 0.45, 0.25) })
//   page.drawText('Photo', {
//     x: photoX + (photoW - textWidth('Photo', 10, true)) / 2,
//     y: boxY + boxH - 14,
//     size: 10, font: boldFont, color: WHITE,
//   })
//   if (uploadedFiles.photo) {
//     try {
//       const img = await embedImage(pdfDoc, uploadedFiles.photo.buffer, uploadedFiles.photo.mimetype)
//       page.drawImage(img, { x: photoX + 2, y: boxY + 2, width: photoW - 4, height: boxH - 24 })
//     } catch (_) {
//       page.drawText('Photo', { x: photoX + (photoW - textWidth('Photo', 10)) / 2, y: boxY + (boxH - 20) / 2 - 5, size: 10, font: regularFont, color: GRAY })
//     }
//   } else {
//     page.drawText('Photo', { x: photoX + (photoW - textWidth('Photo', 10)) / 2, y: boxY + (boxH - 20) / 2 - 5, size: 10, font: regularFont, color: GRAY })
//   }

//   // SIGNATURE BOX
//   page.drawRectangle({ x: sigX, y: boxY, width: sigW, height: boxH, borderColor: GREEN, borderWidth: 1, color: WHITE })
//   page.drawRectangle({ x: sigX, y: boxY + boxH - 20, width: sigW, height: 20, color: rgb(0.2, 0.45, 0.25) })
//   page.drawText('Signature', {
//     x: sigX + (sigW - textWidth('Signature', 10, true)) / 2,
//     y: boxY + boxH - 14,
//     size: 10, font: boldFont, color: WHITE,
//   })
//   if (uploadedFiles.signature) {
//     try {
//       const img = await embedImage(pdfDoc, uploadedFiles.signature.buffer, uploadedFiles.signature.mimetype)
//       page.drawImage(img, { x: sigX + 4, y: boxY + 4, width: sigW - 8, height: boxH - 28 })
//     } catch (_) {
//       page.drawText('Signature', { x: sigX + (sigW - textWidth('Signature', 10)) / 2, y: boxY + (boxH - 20) / 2 - 5, size: 10, font: regularFont, color: GRAY })
//     }
//   } else {
//     page.drawText('Signature', { x: sigX + (sigW - textWidth('Signature', 10)) / 2, y: boxY + (boxH - 20) / 2 - 5, size: 10, font: regularFont, color: GRAY })
//   }

//   // ── DECLARATION FOOTER ────────────────────────────────────────────────────────
//   const footerH = 72
//   page.drawRectangle({ x: 0, y: 0, width, height: footerH, color: GREEN })
//   page.drawText('Declaration:', { x: CX, y: footerH - 14, size: 9.5, font: boldFont, color: YELLOW })
//   page.drawText(
//     'I hereby declare that all information provided above is true and correct to the best of my knowledge.',
//     { x: CX, y: footerH - 27, size: 7.5, font: regularFont, color: rgb(0.88, 0.97, 0.88), maxWidth: CWIDTH }
//   )
//   page.drawText(
//     'Any false information may result in cancellation of application. I agree to all terms and conditions of this recruitment.',
//     { x: CX, y: footerH - 38, size: 7.5, font: regularFont, color: rgb(0.88, 0.97, 0.88), maxWidth: CWIDTH }
//   )
//   page.drawText(
//     'I understand that if I take any legal action in future regarding this registration, it will not be entertained.',
//     { x: CX, y: footerH - 49, size: 7.5, font: regularFont, color: rgb(0.88, 0.97, 0.88), maxWidth: CWIDTH }
//   )
//   page.drawText(`Generated: ${new Date().toLocaleString('en-IN')}  |  Reg. No: ${formData.registrationNo}`, {
//     x: CX, y: 8, size: 7, font: regularFont, color: rgb(0.6, 0.8, 0.6),
//   })

//   // ── CONTENT BORDER ────────────────────────────────────────────────────────────
//   page.drawRectangle({
//     x: BX,
//     y: borderEndY,
//     width: BWIDTH,
//     height: borderStartY - borderEndY,
//     borderColor: GREEN,
//     borderWidth: 2,
//   })

//   // ── PAGE 2+: ATTACHED DOCUMENTS ───────────────────────────────────────────────
//   const docFiles = [
//     { key: 'aadharDoc',     label: 'Aadhar Card'          },
//     { key: 'bankPassbook',  label: 'Bank Passbook'        },
//     { key: 'tenthDoc',      label: '10th Class Marksheet' },
//     { key: 'twelfthDoc',    label: '12th Class Marksheet' },
//     { key: 'additionalDoc', label: 'Additional Document'  },
//     { key: 'screenshot',    label: 'Payment Screenshot'   },
//   ]

//   for (const { key, label } of docFiles) {
//     const file = uploadedFiles[key]
//     if (!file) continue

//     const docPage = pdfDoc.addPage([595, 842])
//     const dpH     = 72

//     docPage.drawRectangle({ x: 0, y: 842 - dpH, width: 595, height: dpH, color: GREEN })
//     await embedLogo(pdfDoc, docPage, 26, 842 - dpH + 9, 54)

//     const dpTextX = 26 + 54 + 10
//     const dpTextW = 595 - dpTextX - 20
//     const dpHead  = 'RURAL WELFARE PROGRAM'
//     const dpSub   = `Attached Document: ${label}`
//     const dpHeadW = textWidth(dpHead, 13, true)
//     const dpSubW  = textWidth(dpSub, 10)

//     docPage.drawText(dpHead, {
//       x: Math.max(dpTextX, dpTextX + (dpTextW - dpHeadW) / 2),
//       y: 842 - dpH + 42, size: 13, font: boldFont, color: WHITE,
//     })
//     docPage.drawText(dpSub, {
//       x: Math.max(dpTextX, dpTextX + (dpTextW - dpSubW) / 2),
//       y: 842 - dpH + 22, size: 10, font: regularFont, color: YELLOW,
//     })
//     docPage.drawRectangle({ x: 0, y: 842 - dpH - 6, width: 595, height: 6, color: YELLOW })

//     const docY = 842 - dpH - 14

//     if (file.mimetype === 'application/pdf') {
//       try {
//         const embedded = await PDFDocument.load(file.buffer)
//         const copied   = await pdfDoc.copyPages(embedded, embedded.getPageIndices())
//         pdfDoc.removePage(pdfDoc.getPageCount() - 1)
//         copied.forEach(p => pdfDoc.addPage(p))
//       } catch (e) {
//         console.error(`Failed to embed PDF for ${label}:`, e)
//         docPage.drawText('Unable to embed PDF document.', { x: BX, y: docY - 20, size: 10, font: regularFont, color: GRAY })
//       }
//     } else {
//       try {
//         const img     = await embedImage(pdfDoc, file.buffer, file.mimetype)
//         const imgDims = img.scaleToFit(BWIDTH, 700)
//         docPage.drawImage(img, {
//           x: (595 - imgDims.width) / 2,
//           y: docY - imgDims.height,
//           width: imgDims.width,
//           height: imgDims.height,
//         })
//       } catch (e) {
//         console.error(`Failed to embed image for ${label}:`, e)
//         docPage.drawText('Unable to embed image.', { x: BX, y: docY - 20, size: 10, font: regularFont, color: GRAY })
//       }
//     }

//     docPage.drawRectangle({
//       x: 18, y: 18, width: 595 - 36, height: 842 - 36,
//       borderColor: GREEN, borderWidth: 1.5,
//     })
//   }

//   return await pdfDoc.save()
// }


























// backend/api/utils/generatePDF.js

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

let existsSync, resolve, dirname, fileURLToPath
try {
  const fs   = await import('fs').catch(() => null)
  const path = await import('path').catch(() => null)
  const url  = await import('url').catch(() => null)
  if (fs && path && url) {
    existsSync    = fs.existsSync
    resolve       = path.resolve
    dirname       = path.dirname
    fileURLToPath = url.fileURLToPath
  }
} catch (_) {}

function getLogoPath() {
  try {
    if (!fileURLToPath || !dirname || !resolve) return null
    const __filename = fileURLToPath(import.meta.url)
    const __dir      = dirname(__filename)
    return resolve(__dir, '../../public/logo.webp')
  } catch (_) { return null }
}

const GREEN  = rgb(0.1,  0.36, 0.16)
const YELLOW = rgb(0.94, 0.75, 0.13)
const LGREEN = rgb(0.94, 0.98, 0.94)
const GRAY   = rgb(0.4,  0.4,  0.4)
const DGRAY  = rgb(0.15, 0.15, 0.15)
const WHITE  = rgb(1, 1, 1)
const RED    = rgb(0.85, 0.1, 0.1)
const ORANGE = rgb(0.9, 0.5, 0.0)

const BX     = 36
const BWIDTH = 595 - 72
const PAD    = 12
const CX     = BX + PAD
const CWIDTH = BWIDTH - PAD * 2

const PAGE_W = 595
const PAGE_H = 842

const HEADER_H      = 72
const YELLOW_STRIPE = 6
const HEADER_TOTAL  = HEADER_H + YELLOW_STRIPE
const FOOTER_H      = 72

const CONTENT_TOP    = PAGE_H - HEADER_TOTAL - 30
const CONTENT_BOTTOM = FOOTER_H + 18

function textWidth(text, size, isBold = false) {
  return text.length * size * (isBold ? 0.56 : 0.52)
}

function wrapText(text, maxChars) {
  if (!text) return ['—']
  const str   = String(text)
  const words = str.split(' ')
  const lines = []
  let cur     = ''
  for (const word of words) {
    const candidate = cur ? `${cur} ${word}` : word
    if (candidate.length <= maxChars) {
      cur = candidate
    } else {
      if (cur) lines.push(cur)
      cur = word.length > maxChars ? word.substring(0, maxChars) : word
    }
  }
  if (cur) lines.push(cur)
  return lines.length ? lines : ['—']
}

async function embedImage(pdfDoc, buffer, mimeType) {
  if (mimeType === 'image/png') return pdfDoc.embedPng(buffer)
  return pdfDoc.embedJpg(buffer)
}

async function embedLogo(pdfDoc, page, x, y, size) {
  try {
    const logoPath = getLogoPath()
    if (logoPath && existsSync && existsSync(logoPath)) {
      const sharp   = (await import('sharp')).default
      const pngBuf  = await sharp(logoPath).png().toBuffer()
      const logoImg = await pdfDoc.embedPng(pngBuf)
      page.drawImage(logoImg, { x, y, width: size, height: size })
    }
  } catch (_) {}
}

async function drawFormHeader(pdfDoc, page, boldFont, regularFont) {
  const { width, height } = page.getSize()
  page.drawRectangle({ x: 0, y: height - HEADER_H, width, height: HEADER_H, color: GREEN })

  const logoSize = 54
  const logoX    = 26
  const logoY    = height - HEADER_H + (HEADER_H - logoSize) / 2
  await embedLogo(pdfDoc, page, logoX, logoY, logoSize)

  const heading    = 'RURAL WELFARE PROGRAM'
  const subheading = 'Application Form'
  const hSize      = 21
  const shSize     = 16
  const hW         = textWidth(heading, hSize, true)
  const shW        = textWidth(subheading, shSize)
  const PAD_TOP    = 6

  page.drawText(heading, {
    x: Math.max(logoX + logoSize + 8, (width - hW) / 2),
    y: height - HEADER_H + 44 - PAD_TOP,
    size: hSize, font: boldFont, color: WHITE,
  })
  page.drawText(subheading, {
    x: (width - shW) / 2,
    y: height - HEADER_H + 22 - PAD_TOP,
    size: shSize, font: regularFont, color: YELLOW,
  })
  page.drawRectangle({ x: 0, y: height - HEADER_TOTAL, width, height: YELLOW_STRIPE, color: YELLOW })
}

function drawFormFooter(page, regularFont, boldFont, registrationNo) {
  const { width } = page.getSize()
  page.drawRectangle({ x: 0, y: 0, width, height: FOOTER_H, color: GREEN })
  page.drawText('Declaration:', { x: CX, y: FOOTER_H - 14, size: 9.5, font: boldFont, color: YELLOW })
  page.drawText(
    'I hereby declare that all information provided above is true and correct to the best of my knowledge.',
    { x: CX, y: FOOTER_H - 27, size: 7.5, font: regularFont, color: rgb(0.88, 0.97, 0.88), maxWidth: CWIDTH }
  )
  page.drawText(
    'Any false information may result in cancellation of application. I agree to all terms and conditions of this recruitment.',
    { x: CX, y: FOOTER_H - 38, size: 7.5, font: regularFont, color: rgb(0.88, 0.97, 0.88), maxWidth: CWIDTH }
  )
  page.drawText(
    'I understand that if I take any legal action in future regarding this registration, it will not be entertained.',
    { x: CX, y: FOOTER_H - 49, size: 7.5, font: regularFont, color: rgb(0.88, 0.97, 0.88), maxWidth: CWIDTH }
  )
  page.drawText(`Generated: ${new Date().toLocaleString('en-IN')}  |  Reg. No: ${registrationNo}`, {
    x: CX, y: 8, size: 7, font: regularFont, color: rgb(0.6, 0.8, 0.6),
  })
}

function drawSectionHeader(page, fonts, y, title) {
  page.drawRectangle({ x: BX, y: y - 4, width: BWIDTH, height: 22, color: GREEN })
  page.drawText(title, { x: CX, y: y + 3, size: 11, font: fonts.bold, color: WHITE })
  return y - 28
}

class PageState {
  constructor(pdfDoc, boldFont, regularFont, registrationNo) {
    this.pdfDoc         = pdfDoc
    this.boldFont       = boldFont
    this.regularFont    = regularFont
    this.registrationNo = registrationNo
    this.fonts          = { bold: boldFont, regular: regularFont }
    this.formPages      = []
    this.borderStartY   = []
    this.borderEndY     = []
    this.page           = null
    this.y              = 0
  }

  async addFormPage() {
    if (this.page !== null) {
      this.borderEndY.push(this.y - 4)
    }
    const p = this.pdfDoc.addPage([PAGE_W, PAGE_H])
    await drawFormHeader(this.pdfDoc, p, this.boldFont, this.regularFont)
    drawFormFooter(p, this.regularFont, this.boldFont, this.registrationNo)
    this.formPages.push(p)
    this.page = p
    this.y    = CONTENT_TOP
    this.borderStartY.push(this.y + 18)
    return p
  }

  async ensureSpace(neededH) {
    if (this.y - neededH < CONTENT_BOTTOM) {
      await this.addFormPage()
    }
  }

  finalizeBorders() {
    if (this.page !== null) {
      this.borderEndY.push(Math.max(this.y - 4, CONTENT_BOTTOM))
    }
    this.formPages.forEach((p, i) => {
      const top    = this.borderStartY[i]
      const bottom = this.borderEndY[i]
      if (top > bottom) {
        p.drawRectangle({
          x: BX, y: bottom,
          width: BWIDTH, height: top - bottom,
          borderColor: GREEN, borderWidth: 2,
        })
      }
    })
  }

  getPage() { return this.page }
  getY()    { return this.y    }
  setY(v)   { this.y = v       }
  nudgeY(d) { this.y -= d      }
}

export async function generateApplicationPDF(formData, paymentId, uploadedFiles) {
  const pdfDoc      = await PDFDocument.create()
  const boldFont    = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fonts       = { bold: boldFont, regular: regularFont }

  const ps = new PageState(pdfDoc, boldFont, regularFont, formData.registrationNo)
  await ps.addFormPage()

  // ── POST + REG NO ─────────────────────────────────────────────────────────────
  const ROW_H = 22
  await ps.ensureSpace(ROW_H + 8)
  let y = ps.getY() - 4

  ps.getPage().drawRectangle({ x: BX, y: y - 4, width: BWIDTH, height: ROW_H, color: LGREEN })
  ps.getPage().drawText('Post',             { x: CX,       y, size: 11, font: boldFont,    color: GRAY  })
  ps.getPage().drawText((formData.postTitle || '').toUpperCase(),
                                            { x: CX + 75,  y, size: 11, font: boldFont,    color: GREEN })
  ps.getPage().drawText('Registration No.', { x: CX + 270, y, size: 11, font: boldFont,    color: GRAY  })
  ps.getPage().drawText(String(formData.registrationNo || ''),
                                            { x: CX + 385, y, size: 11, font: boldFont,    color: GREEN })
  ps.setY(y - ROW_H - 2)

  // ── PERSONAL DETAILS ──────────────────────────────────────────────────────────
  const PERS_FS = 10
  const PERS_RH = 21
  const val1X   = CX + 100
  const col2X   = CX + 258
  const val2X   = CX + 360

  const personalRows = [
    ["Student's Name",  formData.name,                    "Father's Name",  formData.fatherName],
    ["Mother's Name",   formData.motherName,              'Date of Birth',  formData.dob],
    ['Gender',          formData.gender,                  'Category',       formData.category],
    ['Nationality',     formData.nationality || 'Indian', 'Mobile No.',     formData.mobile],
    ['Aadhaar Number',  formData.aadhar,                  'Email Id',       formData.email],
    ['State',           formData.state,                   'District',       formData.district],
    ['Block',           formData.block || '—',            'Pincode',        formData.pincode || '—'],
    ['Qualification',   formData.qualification,           'Reg. Date',      new Date().toLocaleDateString('en-IN')],
    ['Address',         String(formData.address || '—').substring(0, 38),   'Status', 'SUBMITTED'],
  ]

  for (let i = 0; i < personalRows.length; i++) {
    await ps.ensureSpace(PERS_RH + 4)
    const [l1, v1, l2, v2] = personalRows[i]
    const pg = ps.getPage(); y = ps.getY()
    if (i % 2 === 0) pg.drawRectangle({ x: BX, y: y - 4, width: BWIDTH, height: PERS_RH, color: LGREEN })
    pg.drawText(l1,                                               { x: CX,    y, size: PERS_FS, font: boldFont,    color: GRAY  })
    pg.drawText(String(v1 || '—').toUpperCase().substring(0, 22), { x: val1X, y, size: PERS_FS, font: regularFont, color: DGRAY })
    pg.drawText(l2,                                               { x: col2X, y, size: PERS_FS, font: boldFont,    color: GRAY  })
    pg.drawText(String(v2 || '—').toUpperCase().substring(0, 18), { x: val2X, y, size: PERS_FS, font: regularFont, color: DGRAY })
    ps.nudgeY(PERS_RH)
  }
  ps.nudgeY(6)

  // ── EDUCATION TABLE ───────────────────────────────────────────────────────────
  const EDU_FS   = 9
  const EDU_LINE = 11
  const EDU_TPAD = 4
  const COL_H    = 18

  await ps.ensureSpace(28 + COL_H + 4)
  {
    const pg = ps.getPage(); y = ps.getY()
    y = drawSectionHeader(pg, fonts, y, 'Education Eligibility')
    ps.setY(y + 10)
  }

  const eduCols = [
    { label: 'Sr',       x: CX,        maxChars: 3,  key: null          },
    { label: 'Class',    x: CX + 18,   maxChars: 8,  key: 'class'       },
    { label: 'Roll No.', x: CX + 75,   maxChars: 10, key: 'rollEnroll'  },
    { label: 'College',  x: CX + 138,  maxChars: 18, key: 'college'     },
    { label: 'Board',    x: CX + 268,  maxChars: 7,  key: 'board'       },
    { label: 'Year',     x: CX + 316,  maxChars: 4,  key: 'year'        },
    { label: 'Total',    x: CX + 354,  maxChars: 5,  key: 'totalMarks'  },
    { label: 'Obtained', x: CX + 394,  maxChars: 5,  key: 'obtainMarks' },
    { label: '%',        x: CX + 444,  maxChars: 5,  key: 'percentage'  },
  ]

  await ps.ensureSpace(COL_H + 4)
  {
    const pg = ps.getPage(); y = ps.getY()
    pg.drawRectangle({ x: BX, y: y - 4, width: BWIDTH, height: COL_H, color: rgb(0.2, 0.45, 0.25) })
    eduCols.forEach(({ label, x }) => pg.drawText(label, { x, y, size: EDU_FS, font: boldFont, color: WHITE }))
    ps.nudgeY(COL_H + 1)
  }

  const education = JSON.parse(formData.education || '[]')

  for (let i = 0; i < education.length; i++) {
    const row = education[i]

    const wrappedCols = eduCols.map(col => {
      if (col.key === null) return [String(i + 1)]
      let val = row[col.key] || ''
      if (col.key === 'percentage' && val) val = `${val}%`
      return wrapText(String(val), col.maxChars)
    })

    const maxLines = Math.max(...wrappedCols.map(l => l.length))
    const rowH     = maxLines * EDU_LINE + EDU_TPAD * 2 + 2

    await ps.ensureSpace(rowH + 8)
    const pg = ps.getPage(); y = ps.getY()

    const rectBottom = y - 4
    const rectTop    = rectBottom + rowH

    if (i % 2 === 0) pg.drawRectangle({ x: BX, y: rectBottom, width: BWIDTH, height: rowH, color: LGREEN })

    const firstLineY = rectTop - EDU_TPAD - EDU_FS

    eduCols.forEach((col, ci) => {
      wrappedCols[ci].forEach((line, li) => {
        pg.drawText(String(line), {
          x: col.x, y: firstLineY - li * EDU_LINE,
          size: EDU_FS, font: regularFont, color: DGRAY,
        })
      })
    })

    ps.nudgeY(rowH)
  }
  ps.nudgeY(8)

  // ── BANK DETAILS ──────────────────────────────────────────────────────────────
  const BANK_FS = 10
  const BANK_RH = 21
  const bankRows = [
    ['Bank Account No.', formData.bankAccountNo || '—'],
    ['IFSC Code',        formData.bankIfsc       || '—'],
    ['Bank Name',        formData.bankName       || '—'],
  ]

  await ps.ensureSpace(28 + BANK_RH * bankRows.length + 8)
  {
    const pg = ps.getPage(); y = ps.getY()
    y = drawSectionHeader(pg, fonts, y, 'Bank Details')
    ps.setY(y)
  }

  for (let i = 0; i < bankRows.length; i++) {
    await ps.ensureSpace(BANK_RH + 4)
    const [label, value] = bankRows[i]
    const pg = ps.getPage(); y = ps.getY()
    if (i % 2 === 0) pg.drawRectangle({ x: BX, y: y - 4, width: BWIDTH, height: BANK_RH, color: LGREEN })
    pg.drawText(label,         { x: CX + 36,  y, size: BANK_FS, font: boldFont,    color: GRAY  })
    pg.drawText(String(value), { x: CX + 220, y, size: BANK_FS, font: regularFont, color: DGRAY })
    ps.nudgeY(BANK_RH)
  }
  ps.nudgeY(8)

  // ── PAYMENT DETAILS ───────────────────────────────────────────────────────────
  const PAY_FS = 10
  const PAY_RH = 21

  const utrNumber      = formData.utrNumber || formData.transactionId || '—'
  const payMethod      = formData.paymentMethod || 'Manual'
  const amountStr      = formData.category === 'General' ? 'Rs. 1,100' : 'Rs. 1,000'
  const payDateTimeStr = [formData.paymentDate, formData.paymentTime]
    .filter(Boolean).join(' at ') || new Date().toLocaleDateString('en-IN')

  const payRows = [
    ['Payment Method',      payMethod],
    ['UTR / Txn. ID',       utrNumber],
    ...(payMethod === 'UPI' && formData.senderName
      ? [['Sender Name',   formData.senderName]] : []),
    ...(payMethod === 'UPI' && formData.senderUpiId
      ? [['Sender UPI ID', formData.senderUpiId]] : []),
    // ...(payMethod === 'Bank Transfer' && formData.accountHolderName
    //   ? [
    //       ['Account Holder',   formData.accountHolderName],
    //       ['Account (Last 4)', formData.lastFourDigits ? `XXXX-${formData.lastFourDigits}` : '—'],
    //     ] : []),
    ['Amount',              amountStr],
    ['Payment Date / Time', payDateTimeStr],
    ['Payment Status',      'Under Review'],
  ]

  await ps.ensureSpace(28 + PAY_RH * payRows.length + 8)
  {
    const pg = ps.getPage(); y = ps.getY()
    y = drawSectionHeader(pg, fonts, y, 'Payment Details')
    ps.setY(y)
  }

  for (let i = 0; i < payRows.length; i++) {
    await ps.ensureSpace(PAY_RH + 4)
    const [label, value] = payRows[i]
    const pg = ps.getPage(); y = ps.getY()
    if (i % 2 === 0) pg.drawRectangle({ x: BX, y: y - 4, width: BWIDTH, height: PAY_RH, color: LGREEN })
    pg.drawText(label, { x: CX + 36, y, size: PAY_FS, font: boldFont, color: GRAY })
    if (label === 'Payment Status') {
      pg.drawText(String(value), { x: CX + 220, y, size: PAY_FS, font: boldFont, color: ORANGE })
    } else {
      pg.drawText(String(value), { x: CX + 220, y, size: PAY_FS, font: regularFont, color: DGRAY })
    }
    ps.nudgeY(PAY_RH)
  }
  ps.nudgeY(8)

  // ── UPLOADED DOCUMENTS LIST ───────────────────────────────────────────────────
  const DOC_FS = 10
  const DOC_RH = 20
  const halfCW = Math.floor(CWIDTH / 2)

  const allDocs = [
    { key: 'photo',         label: 'Applicant Photo'      },
    { key: 'signature',     label: 'Signature'            },
    { key: 'aadharDoc',     label: 'Aadhar Card'          },
    { key: 'bankPassbook',  label: 'Bank Passbook'        },
    { key: 'tenthDoc',      label: '10th Class Marksheet' },
    { key: 'twelfthDoc',    label: '12th Class Marksheet' },
    { key: 'additionalDoc', label: 'Additional Document'  },
    { key: 'screenshot',    label: 'Payment Screenshot'   },
  ]

  const docListRows = Math.ceil(allDocs.length / 2)
  const docListH    = docListRows * DOC_RH

  await ps.ensureSpace(28 + docListH + 8)
  {
    const pg = ps.getPage(); y = ps.getY()
    y = drawSectionHeader(pg, fonts, y, 'Uploaded Documents')
    ps.setY(y)
  }

  await ps.ensureSpace(docListH + 4)
  {
    const pg = ps.getPage(); y = ps.getY()
    allDocs.forEach((doc, i) => {
      const col    = i % 2
      const rowIdx = Math.floor(i / 2)
      const dx     = CX + col * halfCW
      const dy     = y - rowIdx * DOC_RH

      if (col === 0 && rowIdx % 2 === 0) {
        pg.drawRectangle({ x: BX, y: dy - 5, width: BWIDTH, height: DOC_RH, color: LGREEN })
      }

      const uploaded = !!uploadedFiles[doc.key]
      pg.drawRectangle({ x: dx, y: dy - 2, width: 28, height: 14, color: uploaded ? GREEN : RED })
      pg.drawText(uploaded ? 'YES' : 'NO', { x: dx + 4, y: dy + 1, size: 8.5, font: boldFont, color: WHITE })
      pg.drawText(doc.label, { x: dx + 32, y: dy, size: DOC_FS, font: regularFont, color: DGRAY })
    })
    ps.nudgeY(docListH + 12)
  }

  // ── DATE / PHOTO / SIGNATURE BOXES ───────────────────────────────────────────
  const boxH      = 95
  const gap       = 3
  const totalBoxW = BWIDTH - gap * 2
  const dateW     = Math.floor(totalBoxW / 3)
  const photoW    = Math.floor(totalBoxW / 3)
  const sigW      = totalBoxW - dateW - photoW

  const dateX  = BX
  const photoX = dateX  + dateW  + gap
  const sigX   = photoX + photoW + gap

  await ps.ensureSpace(boxH + 20)
  {
    const pg  = ps.getPage(); y = ps.getY()
    const boxY = y - boxH

    // DATE BOX
    const dateStr  = new Date().toLocaleDateString('en-IN')
    const dFontSz  = 13
    const dateStrW = textWidth(dateStr, dFontSz, true)
    pg.drawRectangle({ x: dateX, y: boxY, width: dateW, height: boxH, borderColor: GREEN, borderWidth: 1, color: LGREEN })
    pg.drawRectangle({ x: dateX, y: boxY + boxH - 20, width: dateW, height: 20, color: rgb(0.2, 0.45, 0.25) })
    pg.drawText('Date', {
      x: dateX + (dateW - textWidth('Date', 10, true)) / 2,
      y: boxY + boxH - 14, size: 10, font: boldFont, color: WHITE,
    })
    pg.drawText(dateStr, {
      x: dateX + (dateW - dateStrW) / 2,
      y: boxY + (boxH - 20) / 2 - 5, size: dFontSz, font: boldFont, color: GREEN,
    })

    // PHOTO BOX
    pg.drawRectangle({ x: photoX, y: boxY, width: photoW, height: boxH, borderColor: GREEN, borderWidth: 1, color: LGREEN })
    pg.drawRectangle({ x: photoX, y: boxY + boxH - 20, width: photoW, height: 20, color: rgb(0.2, 0.45, 0.25) })
    pg.drawText('Photo', {
      x: photoX + (photoW - textWidth('Photo', 10, true)) / 2,
      y: boxY + boxH - 14, size: 10, font: boldFont, color: WHITE,
    })
    if (uploadedFiles.photo) {
      try {
        const img = await embedImage(pdfDoc, uploadedFiles.photo.buffer, uploadedFiles.photo.mimetype)
        pg.drawImage(img, { x: photoX + 2, y: boxY + 2, width: photoW - 4, height: boxH - 24 })
      } catch (_) {
        pg.drawText('Photo', { x: photoX + (photoW - textWidth('Photo', 10)) / 2, y: boxY + (boxH - 20) / 2 - 5, size: 10, font: regularFont, color: GRAY })
      }
    } else {
      pg.drawText('Photo', { x: photoX + (photoW - textWidth('Photo', 10)) / 2, y: boxY + (boxH - 20) / 2 - 5, size: 10, font: regularFont, color: GRAY })
    }

    // SIGNATURE BOX
    pg.drawRectangle({ x: sigX, y: boxY, width: sigW, height: boxH, borderColor: GREEN, borderWidth: 1, color: WHITE })
    pg.drawRectangle({ x: sigX, y: boxY + boxH - 20, width: sigW, height: 20, color: rgb(0.2, 0.45, 0.25) })
    pg.drawText('Signature', {
      x: sigX + (sigW - textWidth('Signature', 10, true)) / 2,
      y: boxY + boxH - 14, size: 10, font: boldFont, color: WHITE,
    })
    if (uploadedFiles.signature) {
      try {
        const img = await embedImage(pdfDoc, uploadedFiles.signature.buffer, uploadedFiles.signature.mimetype)
        pg.drawImage(img, { x: sigX + 4, y: boxY + 4, width: sigW - 8, height: boxH - 28 })
      } catch (_) {
        pg.drawText('Signature', { x: sigX + (sigW - textWidth('Signature', 10)) / 2, y: boxY + (boxH - 20) / 2 - 5, size: 10, font: regularFont, color: GRAY })
      }
    } else {
      pg.drawText('Signature', { x: sigX + (sigW - textWidth('Signature', 10)) / 2, y: boxY + (boxH - 20) / 2 - 5, size: 10, font: regularFont, color: GRAY })
    }

    ps.nudgeY(boxH + 10)
  }

  // ── Finalize borders on all form pages ────────────────────────────────────────
  ps.finalizeBorders()

  // ── ATTACHED DOCUMENT PAGES — no header/footer ────────────────────────────────
  const docFiles = [
    { key: 'aadharDoc',     label: 'Aadhar Card'          },
    { key: 'bankPassbook',  label: 'Bank Passbook'        },
    { key: 'tenthDoc',      label: '10th Class Marksheet' },
    { key: 'twelfthDoc',    label: '12th Class Marksheet' },
    { key: 'additionalDoc', label: 'Additional Document'  },
    { key: 'screenshot',    label: 'Payment Screenshot'   },
  ]

  for (const { key, label } of docFiles) {
    const file = uploadedFiles[key]
    if (!file) continue

    if (file.mimetype === 'application/pdf') {
      try {
        const embedded = await PDFDocument.load(file.buffer)
        const copied   = await pdfDoc.copyPages(embedded, embedded.getPageIndices())
        copied.forEach(p => pdfDoc.addPage(p))
      } catch (_) {
        const ep = pdfDoc.addPage([PAGE_W, PAGE_H])
        ep.drawText(`Unable to embed PDF: ${label}`, { x: BX, y: PAGE_H / 2, size: 11, font: regularFont, color: GRAY })
      }
    } else {
      const docPage = pdfDoc.addPage([PAGE_W, PAGE_H])
      try {
        const img     = await embedImage(pdfDoc, file.buffer, file.mimetype)
        const imgDims = img.scaleToFit(PAGE_W - 40, PAGE_H - 40)
        docPage.drawImage(img, {
          x:      (PAGE_W - imgDims.width)  / 2,
          y:      (PAGE_H - imgDims.height) / 2,
          width:  imgDims.width,
          height: imgDims.height,
        })
      } catch (_) {
        docPage.drawText(`Unable to embed image: ${label}`, { x: BX, y: PAGE_H / 2, size: 11, font: regularFont, color: GRAY })
      }
      docPage.drawRectangle({ x: 18, y: 18, width: PAGE_W - 36, height: PAGE_H - 36, borderColor: GREEN, borderWidth: 1.5 })
      docPage.drawText(label, { x: BX + 4, y: PAGE_H - 26, size: 9, font: boldFont, color: GRAY })
    }
  }

  return await pdfDoc.save()
}