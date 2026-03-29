// test-pdf.js
import { generateApplicationPDF } from './api/utils/generatePDF.js'
import fs from 'fs'

// Dummy 1x1 white JPEG buffer (no real file needed)
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

const formData = {
  name:          'Priya Sharma',
  fatherName:    'Ramesh Sharma',
  motherName:    'Sunita Sharma',
  dob:           '1998-05-15',
  mobile:        '9876543210',
  email:         'priya@example.com',
  gender:        'Female',
  category:      'General',
  nationality:   'Indian',
  state:         'Uttar Pradesh',
  district:      'Prayagraj',
  address:       'Village Rampur, Post Naini, PIN 211008',
  qualification: 'Graduate',
  aadhar:        '123456789012',
  postTitle:     'Gram Panchayat Adhikari',
  postLevel:     'Level 5',
  registrationNo:'1234567890',
  education: JSON.stringify([
    { class: '10th Class', rollEnroll: 'UP1234', college: 'Govt Inter College',  board: 'UP Board',            year: '2014', totalMarks: '500',  obtainMarks: '425', percentage: '85.00' },
    { class: '12th Class', rollEnroll: 'UP5678', college: 'Govt Inter College',  board: 'UP Board',            year: '2016', totalMarks: '500',  obtainMarks: '410', percentage: '82.00' },
    { class: 'Graduation', rollEnroll: 'AU9012', college: 'Allahabad University', board: 'Allahabad University', year: '2019', totalMarks: '1200', obtainMarks: '960', percentage: '80.00' },
  ]),
}

const uploadedFiles = {
  photo:           { buffer: dummyJpg, mimetype: 'image/jpeg' },
  signature:       { buffer: dummyJpg, mimetype: 'image/jpeg' },
  aadharDoc:       { buffer: dummyPdf, mimetype: 'application/pdf' },
  tenthDoc:        null,
  twelfthDoc:      null,
  graduationDoc:   null,
  qualificationDoc:null,
  additionalDoc:   null,
}

const pdfBytes = await generateApplicationPDF(formData, 'pay_TestPayment123', uploadedFiles)
fs.writeFileSync('output-test.pdf', pdfBytes)
console.log('✅ PDF generated: output-test.pdf')