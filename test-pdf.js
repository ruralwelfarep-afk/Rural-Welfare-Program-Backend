// test-pdf.js
import { generateApplicationPDF } from './api/utils/generatePDF.js'
import fs from 'fs'

// Dummy 1x1 white JPEG buffer
const dummyJpg = Buffer.from(
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8U' +
  'HRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgN' +
  'DRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIy' +
  'MjL/wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAA' +
  'AAAAAAAAAAAAAP/EABQBAQAAAAAAAAAAAAAAAAAAAAD/xAAUEQEAAAAAAAAAAAAAAAAAAAAA' +
  '/9oADAMBAAIRAxEAPwCwABmX/9k=',
  'base64'
)

// Dummy PDF buffer
const dummyPdf = Buffer.from(
  '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n' +
  '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n' +
  '3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj\n' +
  'xref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n' +
  '0000000058 00000 n\n0000000115 00000 n\n' +
  'trailer<</Size 4/Root 1 0 R>>\nstartxref\n190\n%%EOF'
)

// ✅ FULL FORM DATA
const formData = {
  // Basic Details
  name: 'Priya Sharma',
  fatherName: 'Ramesh Sharma',
  motherName: 'Sunita Sharma',
  dob: '1998-05-15',
  gender: 'Female',
  category: 'General',
  nationality: 'Indian',

  // Contact
  mobile: '9876543210',
  email: 'priya@example.com',

  // Address
  state: 'Uttar Pradesh',
  district: 'Prayagraj',
  block: 'Chaka',
  pincode: '211008',
  address: 'Village Rampur, Post Naini, PIN 211008',

  // Identity
  aadhar: '123456789012',

  // Post Info
  postTitle: 'Gram Panchayat Adhikari',
  postLevel: 'Level 5',
  registrationNo: '1234567890',

  // Qualification
  qualification: 'Graduate',

  // Education
  education: JSON.stringify([
    {
      class: '10th Class',
      rollEnroll: 'UP1234',
      college: 'Govt Inter College',
      board: 'UP Board',
      year: '2014',
      totalMarks: '500',
      obtainMarks: '425',
      percentage: '85.00'
    },
    {
      class: '12th Class',
      rollEnroll: 'UP5678',
      college: 'Govt Inter College',
      board: 'UP Board',
      year: '2016',
      totalMarks: '500',
      obtainMarks: '410',
      percentage: '82.00'
    },

  ]),

  // Bank Details ✅ (NEW)
  bankAccountNo: '123456789012',
  bankIfsc: 'SBIN0001234',
  bankName: 'State Bank of India',

  // Payment Details ✅ (IMPORTANT)
  paymentMethod: 'UPI', // UPI / Bank Transfer
  utrNumber: 'UTR123456789',
  senderName: 'Priya Sharma',
  senderUpiId: 'priya@upi',
  paymentDate: '2026-03-31',
  paymentTime: '10:45 AM',

  // Alternative for bank transfer
  accountHolderName: 'Priya Sharma',
  lastFourDigits: '9012',
}

// ✅ FILES
const uploadedFiles = {
  photo:           { buffer: dummyJpg, mimetype: 'image/jpeg' },
  signature:       { buffer: dummyJpg, mimetype: 'image/jpeg' },
  aadharDoc:       { buffer: dummyPdf, mimetype: 'application/pdf' },
  bankPassbook:    { buffer: dummyPdf, mimetype: 'application/pdf' },
  tenthDoc:        { buffer: dummyPdf, mimetype: 'application/pdf' },
  twelfthDoc:      { buffer: dummyPdf, mimetype: 'application/pdf' },
  additionalDoc:   null,
  screenshot:      { buffer: dummyJpg, mimetype: 'image/jpeg' },
}

// ✅ GENERATE PDF
const pdfBytes = await generateApplicationPDF(
  formData,
  'pay_TestPayment123',
  uploadedFiles
)

fs.writeFileSync('output-test.pdf', pdfBytes)

console.log('✅ PDF generated: output-test.pdf')