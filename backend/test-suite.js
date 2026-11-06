const sharp = require('sharp');
const { PDFDocument, PDFName, PDFRawStream } = require('pdf-lib');
const { createApp } = require('./server');
const { cleanupUploadDirectory } = require('./middleware/upload');
const { convertImageToPdf } = require('./controllers/imageToPdf');

const app = createApp();
let server;
let baseUrl;

function assert(condition, testName) {
  if (condition) {
    console.log(`[PASS] ${testName}`);
    return true;
  }

  console.error(`[FAIL] ${testName}`);
  return false;
}

async function request(path, options = {}) {
  return fetch(`${baseUrl}${path}`, options);
}

async function responseBuffer(response) {
  return Buffer.from(await response.arrayBuffer());
}

function appendFiles(form, field, files, type) {
  files.forEach((buffer, index) => {
    form.append(field, new Blob([buffer], { type }), `fixture-${index}.${type.split('/')[1]}`);
  });
}

async function createPdf(pageSizes = [[200, 200]]) {
  const doc = await PDFDocument.create();
  pageSizes.forEach((size) => doc.addPage(size));
  return Buffer.from(await doc.save());
}

async function invokeConvertWithOffset(buffer) {
  const response = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader() {},
    send(value) {
      this.body = Buffer.from(value);
      return this;
    },
    json(value) {
      this.body = value;
      return this;
    },
  };

  await convertImageToPdf({ files: [{ buffer }] }, response);
  return response;
}

async function runTests() {
  server = await new Promise((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  console.log(`Test server running on ${baseUrl}`);

  let passed = 0;
  let failed = 0;
  const check = (condition, name) => {
    if (assert(condition, name)) passed += 1;
    else failed += 1;
  };

  try {
    const health = await request('/api/health');
    const healthData = await health.json();
    check(health.status === 200 && healthData.status === 'ok', 'GET /api/health uses production app configuration');

    const notFound = await request('/api/no-such-route');
    const notFoundData = await notFound.json();
    check(notFound.status === 404 && notFoundData.message === 'Route not found.', 'Unknown routes return consistent JSON 404 responses');

    const jpg = await sharp({
      create: { width: 100, height: 80, channels: 3, background: { r: 255, g: 0, b: 0 } },
    }).jpeg().toBuffer();
    const png = await sharp({
      create: { width: 100, height: 80, channels: 4, background: { r: 0, g: 255, b: 0, alpha: 0.5 } },
    }).png().toBuffer();
    const webp = await sharp({
      create: { width: 100, height: 80, channels: 3, background: { r: 0, g: 0, b: 255 } },
    }).webp().toBuffer();

    const imageForm = new FormData();
    appendFiles(imageForm, 'images', [jpg, png, webp], 'image/jpeg');
    const imageResponse = await request('/api/image-to-pdf', { method: 'POST', body: imageForm });
    const imagePdf = await PDFDocument.load(await responseBuffer(imageResponse));
    check(imageResponse.status === 200 && imagePdf.getPageCount() === 3, 'Image-to-PDF converts supported images');

    const firstPdf = await createPdf([[200, 200]]);
    const secondPdf = await createPdf([[300, 300], [400, 400]]);
    const mergeForm = new FormData();
    appendFiles(mergeForm, 'pdfs', [firstPdf, secondPdf], 'application/pdf');
    const mergeResponse = await request('/api/merge-pdf', { method: 'POST', body: mergeForm });
    const mergedPdf = await PDFDocument.load(await responseBuffer(mergeResponse));
    check(mergeResponse.status === 200 && mergedPdf.getPageCount() === 3, 'PDF merge preserves page order and count');

    const compressPdfForm = new FormData();
    compressPdfForm.append('pdf', new Blob([firstPdf], { type: 'application/pdf' }), 'source.pdf');
    compressPdfForm.append('level', 'low');
    const compressPdfResponse = await request('/api/compress-pdf', {
      method: 'POST',
      body: compressPdfForm,
    });
    const compressedPdfBytes = await responseBuffer(compressPdfResponse);
    check(
      compressPdfResponse.status === 200
      && (await PDFDocument.load(compressedPdfBytes)).getPageCount() === 1,
      'PDF compression returns a valid PDF',
    );

    for (const [name, buffer, mime] of [['JPEG', jpg, 'image/jpeg'], ['PNG', png, 'image/png'], ['WebP', webp, 'image/webp']]) {
      const form = new FormData();
      form.append('image', new Blob([buffer], { type: mime }), `source.${name.toLowerCase()}`);
      form.append('level', 'low');
      const response = await request('/api/compress-image', { method: 'POST', body: form });
      const result = await responseBuffer(response);
      const metadata = await sharp(result).metadata();
      check(response.status === 200 && metadata.format === name.toLowerCase(), `Image compression returns valid ${name}`);
    }

    const fakePdfForm = new FormData();
    fakePdfForm.append('pdfs', new Blob([Buffer.from('not a pdf')], { type: 'application/pdf' }), 'fake.pdf');
    fakePdfForm.append('pdfs', new Blob([Buffer.from('not a pdf')], { type: 'application/pdf' }), 'fake-2.pdf');
    const fakePdfResponse = await request('/api/merge-pdf', { method: 'POST', body: fakePdfForm });
    check(fakePdfResponse.status === 422, 'Malformed PDFs return a client validation status');

    const fakeImageForm = new FormData();
    fakeImageForm.append('image', new Blob([Buffer.from('<svg></svg>')], { type: 'image/jpeg' }), 'renamed.jpg');
    fakeImageForm.append('level', 'low');
    const fakeImageResponse = await request('/api/compress-image', { method: 'POST', body: fakeImageForm });
    check(fakeImageResponse.status === 422, 'Renamed unsupported images are rejected before Sharp');

    const truncatedImageForm = new FormData();
    truncatedImageForm.append(
      'image',
      new Blob([png.subarray(0, png.length - 40)], { type: 'image/png' }),
      'truncated.png',
    );
    truncatedImageForm.append('level', 'low');
    const truncatedImageResponse = await request('/api/compress-image', {
      method: 'POST',
      body: truncatedImageForm,
    });
    check(truncatedImageResponse.status === 422, 'Truncated images return a client validation status');

    const compressedJsonResponse = await request('/api/health', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Encoding': 'br',
      },
      body: Buffer.from('{}'),
    });
    check(compressedJsonResponse.status === 415, 'Compressed JSON bodies are rejected safely');

    const invalidLevelForm = new FormData();
    invalidLevelForm.append('image', new Blob([jpg], { type: 'image/jpeg' }), 'source.jpg');
    invalidLevelForm.append('level', 'invalid');
    const invalidLevelResponse = await request('/api/compress-image', {
      method: 'POST',
      body: invalidLevelForm,
    });
    check(invalidLevelResponse.status === 400, 'Invalid compression levels return 400');

    const missingLevelForm = new FormData();
    missingLevelForm.append('image', new Blob([jpg], { type: 'image/jpeg' }), 'source.jpg');
    const missingLevelResponse = await request('/api/compress-image', {
      method: 'POST',
      body: missingLevelForm,
    });
    check(missingLevelResponse.status === 400, 'Missing compression levels return 400');

    const excessiveFieldsForm = new FormData();
    excessiveFieldsForm.append('image', new Blob([jpg], { type: 'image/jpeg' }), 'source.jpg');
    excessiveFieldsForm.append('level', 'low');
    excessiveFieldsForm.append('unexpected', 'not allowed');
    const excessiveFieldsResponse = await request('/api/compress-image', {
      method: 'POST',
      body: excessiveFieldsForm,
    });
    check(excessiveFieldsResponse.status === 400, 'Unexpected multipart fields are rejected');

    const orientationInput = await sharp({
      create: { width: 120, height: 80, channels: 3, background: 'red' },
    }).jpeg({ quality: 100 }).withMetadata({ orientation: 6 }).toBuffer();
    const orientationForm = new FormData();
    orientationForm.append('images', new Blob([orientationInput], { type: 'image/jpeg' }), 'portrait.jpg');
    const orientationResponse = await request('/api/image-to-pdf', {
      method: 'POST',
      body: orientationForm,
    });
    const orientationPdf = await PDFDocument.load(await responseBuffer(orientationResponse));
    const orientationPage = orientationPdf.getPages()[0].getSize();
    check(
      orientationResponse.status === 200 && orientationPage.height > orientationPage.width,
      'EXIF orientation is applied before PDF embedding',
    );

    const animatedRaw = Buffer.alloc(32 * 64 * 3);
    for (let index = 0; index < animatedRaw.length; index += 3) {
      animatedRaw[index] = 255;
      animatedRaw[index + 1] = index % 255;
    }
    const animatedWebp = await sharp(animatedRaw, {
      raw: { width: 32, height: 64, channels: 3, pageHeight: 32 },
    }).webp({ quality: 80, loop: 0, delay: [100, 100] }).toBuffer();
    const animatedForm = new FormData();
    animatedForm.append('image', new Blob([animatedWebp], { type: 'image/webp' }), 'animated.webp');
    animatedForm.append('level', 'low');
    const animatedResponse = await request('/api/compress-image', {
      method: 'POST',
      body: animatedForm,
    });
    check(animatedResponse.status === 422, 'Animated WebP is explicitly rejected');

    const formDoc = await PDFDocument.create();
    const formPage = formDoc.addPage([300, 300]);
    const field = formDoc.getForm().createTextField('fixtureField');
    field.setText('fixture');
    field.addToPage(formPage, { x: 20, y: 20, width: 120, height: 30 });
    const formPdf = Buffer.from(await formDoc.save());
    const formMerge = new FormData();
    appendFiles(formMerge, 'pdfs', [formPdf, firstPdf], 'application/pdf');
    const formMergeResponse = await request('/api/merge-pdf', { method: 'POST', body: formMerge });
    check(formMergeResponse.status === 422, 'PDF forms are rejected rather than silently destroyed');

    const cmykImage = await sharp({
      create: { width: 500, height: 400, channels: 3, background: { r: 10, g: 100, b: 200 } },
    }).toColourspace('cmyk').jpeg({ quality: 100 }).toBuffer();
    const cmykDoc = await PDFDocument.create();
    const cmykEmbedded = await cmykDoc.embedJpg(cmykImage);
    cmykDoc.addPage([500, 400]).drawImage(cmykEmbedded, { x: 0, y: 0, width: 500, height: 400 });
    const cmykPdf = Buffer.from(await cmykDoc.save({ useObjectStreams: false }));
    const cmykForm = new FormData();
    cmykForm.append('pdf', new Blob([cmykPdf], { type: 'application/pdf' }), 'cmyk.pdf');
    cmykForm.append('level', 'low');
    const cmykResponse = await request('/api/compress-pdf', { method: 'POST', body: cmykForm });
    const cmykOutput = await PDFDocument.load(await responseBuffer(cmykResponse));
    let cmykColorSpace;
    for (const [, object] of cmykOutput.context.enumerateIndirectObjects()) {
      if (object instanceof PDFRawStream && object.dict.get(PDFName.of('Subtype')) === PDFName.of('Image')) {
        cmykColorSpace = object.dict.get(PDFName.of('ColorSpace'))?.toString();
        break;
      }
    }
    check(cmykResponse.status === 200 && cmykColorSpace === '/DeviceCMYK', 'CMYK PDF streams retain color-space metadata');

    const offsetPool = Buffer.alloc(128 + jpg.length);
    jpg.copy(offsetPool, 128);
    const offsetResponse = await invokeConvertWithOffset(offsetPool.subarray(128));
    check(offsetResponse.statusCode === 200, 'JPEG buffers with nonzero offsets are normalized safely');
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await cleanupUploadDirectory();
  }

  console.log('\n========================================');
  console.log(`TOTAL TESTS: ${passed + failed}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log('========================================\n');

  if (failed > 0) process.exitCode = 1;
}

runTests().catch((error) => {
  console.error('Test suite failed:', error);
  process.exitCode = 1;
});
