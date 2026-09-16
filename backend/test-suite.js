const sharp = require('sharp');
const { PDFDocument } = require('pdf-lib');
const express = require('express');
const cors = require('cors');
const multer = require('multer');

process.env.PORT = '5099';

const app = express();
app.use(cors({ origin: '*', exposedHeaders: ['Content-Length', 'Content-Type', 'Content-Disposition'] }));
app.use(express.json());

const imageToPdfRoute = require('./routes/imageToPdf');
const mergePdfRoute = require('./routes/mergePdf');
const compressPdfRoute = require('./routes/compressPdf');
const compressImageRoute = require('./routes/compressImage');

app.use('/api/image-to-pdf', imageToPdfRoute);
app.use('/api/merge-pdf', mergePdfRoute);
app.use('/api/compress-pdf', compressPdfRoute);
app.use('/api/compress-image', compressImageRoute);

app.get(['/', '/health', '/api', '/api/health'], (req, res) => {
  res.json({ status: 'ok', message: 'TigerPDF Backend is running!' });
});

// Error handler
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ message: 'This file is larger than the supported 20 MB limit.' });
    }
    return res.status(400).json({ message: err.message });
  }
  if (err.status === 400 || err.isClientError) {
    return res.status(400).json({ message: err.message });
  }
  return res.status(500).json({ message: err.message });
});

let server;

async function runTests() {
  await new Promise((resolve) => {
    server = app.listen(5099, resolve);
  });
  console.log('Test server running on port 5099');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  // 1. Health check test
  try {
    const res = await fetch('http://localhost:5099/api/health');
    const data = await res.json();
    assert(res.status === 200 && data.status === 'ok', 'GET /api/health returns 200 OK');
  } catch (err) {
    assert(false, 'GET /api/health returns 200 OK: ' + err.message);
  }

  try {
    const res = await fetch('http://localhost:5099/health');
    const data = await res.json();
    assert(res.status === 200 && data.status === 'ok', 'GET /health returns 200 OK');
  } catch (err) {
    assert(false, 'GET /health returns 200 OK: ' + err.message);
  }

  // 2. Image to PDF test
  try {
    const jpgBuf = await sharp({ create: { width: 100, height: 100, channels: 3, background: { r: 255, g: 0, b: 0 } } }).jpeg().toBuffer();
    const pngBuf = await sharp({ create: { width: 100, height: 100, channels: 4, background: { r: 0, g: 255, b: 0, alpha: 0.5 } } }).png().toBuffer();
    const webpBuf = await sharp({ create: { width: 100, height: 100, channels: 3, background: { r: 0, g: 0, b: 255 } } }).webp().toBuffer();

    const form = new FormData();
    form.append('images', new Blob([jpgBuf], { type: 'image/jpeg' }), 'test1.jpg');
    form.append('images', new Blob([pngBuf], { type: 'image/png' }), 'test2.png');
    form.append('images', new Blob([webpBuf], { type: 'image/webp' }), 'test3.webp');

    const res = await fetch('http://localhost:5099/api/image-to-pdf', {
      method: 'POST',
      body: form,
    });

    const pdfBuffer = Buffer.from(await res.arrayBuffer());
    const doc = await PDFDocument.load(pdfBuffer);
    assert(res.status === 200 && doc.getPageCount() === 3, 'POST /api/image-to-pdf converts JPG, PNG, and WebP into 3-page PDF');
  } catch (err) {
    assert(false, 'POST /api/image-to-pdf: ' + err.message);
  }

  // 3. Merge PDF test
  try {
    const doc1 = await PDFDocument.create();
    doc1.addPage([200, 200]);
    const pdf1 = Buffer.from(await doc1.save());

    const doc2 = await PDFDocument.create();
    doc2.addPage([200, 200]);
    doc2.addPage([200, 200]);
    const pdf2 = Buffer.from(await doc2.save());

    const form = new FormData();
    form.append('pdfs', new Blob([pdf1], { type: 'application/pdf' }), 'file1.pdf');
    form.append('pdfs', new Blob([pdf2], { type: 'application/pdf' }), 'file2.pdf');

    const res = await fetch('http://localhost:5099/api/merge-pdf', {
      method: 'POST',
      body: form,
    });

    const mergedBuf = Buffer.from(await res.arrayBuffer());
    const mergedDoc = await PDFDocument.load(mergedBuf);
    assert(res.status === 200 && mergedDoc.getPageCount() === 3, 'POST /api/merge-pdf merges 1-page and 2-page PDFs into 3-page PDF');
  } catch (err) {
    assert(false, 'POST /api/merge-pdf: ' + err.message);
  }

  // 4. Compress PDF test
  try {
    const doc = await PDFDocument.create();
    const page = doc.addPage([600, 800]);
    const imgBuf = await sharp({ create: { width: 800, height: 600, channels: 3, background: { r: 100, g: 150, b: 200 } } }).jpeg().toBuffer();
    const embeddedImg = await doc.embedJpg(imgBuf);
    page.drawImage(embeddedImg, { x: 0, y: 0, width: 600, height: 400 });
    const originalPdfBuf = Buffer.from(await doc.save());

    const form = new FormData();
    form.append('pdf', new Blob([originalPdfBuf], { type: 'application/pdf' }), 'large.pdf');
    form.append('level', 'low');

    const res = await fetch('http://localhost:5099/api/compress-pdf', {
      method: 'POST',
      body: form,
    });

    const compressedBuf = Buffer.from(await res.arrayBuffer());
    const compressedDoc = await PDFDocument.load(compressedBuf);
    assert(res.status === 200 && compressedDoc.getPageCount() === 1 && compressedBuf.length <= originalPdfBuf.length, 'POST /api/compress-pdf returns valid PDF and does not inflate file size');
  } catch (err) {
    assert(false, 'POST /api/compress-pdf: ' + err.message);
  }

  // 5. Compress Image test (JPEG, PNG, WebP)
  try {
    const jpgInput = await sharp({ create: { width: 500, height: 500, channels: 3, background: { r: 180, g: 80, b: 40 } } }).jpeg({ quality: 100 }).toBuffer();
    const formJpg = new FormData();
    formJpg.append('image', new Blob([jpgInput], { type: 'image/jpeg' }), 'sample.jpg');
    formJpg.append('level', 'low');

    const resJpg = await fetch('http://localhost:5099/api/compress-image', {
      method: 'POST',
      body: formJpg,
    });
    const compressedJpgBuf = Buffer.from(await resJpg.arrayBuffer());
    const jpgMeta = await sharp(compressedJpgBuf).metadata();
    assert(resJpg.status === 200 && jpgMeta.format === 'jpeg', 'POST /api/compress-image compresses JPEG and returns valid JPEG');

    // PNG test
    const pngInput = await sharp({ create: { width: 300, height: 300, channels: 4, background: { r: 40, g: 180, b: 90, alpha: 1 } } }).png().toBuffer();
    const formPng = new FormData();
    formPng.append('image', new Blob([pngInput], { type: 'image/png' }), 'sample.png');
    formPng.append('level', 'low');

    const resPng = await fetch('http://localhost:5099/api/compress-image', {
      method: 'POST',
      body: formPng,
    });
    const compressedPngBuf = Buffer.from(await resPng.arrayBuffer());
    const pngMeta = await sharp(compressedPngBuf).metadata();
    assert(resPng.status === 200 && pngMeta.format === 'png', 'POST /api/compress-image compresses PNG and returns valid PNG');

    // WebP test
    const webpInput = await sharp({ create: { width: 300, height: 300, channels: 3, background: { r: 90, g: 40, b: 180 } } }).webp({ quality: 100 }).toBuffer();
    const formWebp = new FormData();
    formWebp.append('image', new Blob([webpInput], { type: 'image/webp' }), 'sample.webp');
    formWebp.append('level', 'low');

    const resWebp = await fetch('http://localhost:5099/api/compress-image', {
      method: 'POST',
      body: formWebp,
    });
    const compressedWebpBuf = Buffer.from(await resWebp.arrayBuffer());
    const webpMeta = await sharp(compressedWebpBuf).metadata();
    assert(resWebp.status === 200 && webpMeta.format === 'webp', 'POST /api/compress-image compresses WebP and returns valid WebP');
  } catch (err) {
    assert(false, 'POST /api/compress-image: ' + err.message);
  }

  // 6. Validation / Malformed file tests
  try {
    const fakePdf = Buffer.from('This is not a real PDF file! Plain text.');
    const form = new FormData();
    form.append('pdfs', new Blob([fakePdf], { type: 'application/pdf' }), 'fake.pdf');
    form.append('pdfs', new Blob([fakePdf], { type: 'application/pdf' }), 'fake2.pdf');

    const res = await fetch('http://localhost:5099/api/merge-pdf', {
      method: 'POST',
      body: form,
    });
    assert(res.status === 400, 'POST /api/merge-pdf rejects fake/corrupted PDF with 400 Bad Request');
  } catch (err) {
    assert(false, 'Validation test fake PDF: ' + err.message);
  }

  try {
    const doc = await PDFDocument.create();
    doc.addPage([100, 100]);
    const validPdf = Buffer.from(await doc.save());

    const form = new FormData();
    form.append('pdfs', new Blob([validPdf], { type: 'application/pdf' }), 'onlyone.pdf');

    const res = await fetch('http://localhost:5099/api/merge-pdf', {
      method: 'POST',
      body: form,
    });
    assert(res.status === 400, 'POST /api/merge-pdf rejects single file with 400 Bad Request');
  } catch (err) {
    assert(false, 'Validation test single PDF: ' + err.message);
  }

  try {
    const fakeImg = Buffer.from('Hello world non-image string');
    const form = new FormData();
    form.append('image', new Blob([fakeImg], { type: 'image/png' }), 'fake.png');

    const res = await fetch('http://localhost:5099/api/compress-image', {
      method: 'POST',
      body: form,
    });
    assert(res.status === 400, 'POST /api/compress-image rejects fake/corrupted image with 400 Bad Request');
  } catch (err) {
    assert(false, 'Validation test fake image: ' + err.message);
  }

  server.close();
  console.log('\n========================================');
  console.log(`TOTAL TESTS: ${passed + failed}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log('========================================\n');

  if (failed > 0) process.exit(1);
}

runTests();
