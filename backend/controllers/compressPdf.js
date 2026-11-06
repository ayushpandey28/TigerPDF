const fs = require('fs/promises');
const sharp = require('sharp');
const {
  EncryptedPDFError,
  PDFDocument,
  PDFName,
  PDFNumber,
  PDFRawStream,
} = require('pdf-lib');
const {
  MAX_PDF_PAGES,
  createClientError,
  hasPdfSignature,
  toStandaloneBuffer,
} = require('../utils/fileValidation');
const { cleanupUploadFile } = require('../middleware/upload');

const compressionLevels = new Set(['high', 'medium', 'low', 'small']);

function getCompressionLevel(req) {
  const level = req.body?.level;
  if (typeof level !== 'string' || !compressionLevels.has(level)) {
    throw createClientError(
      'Compression level must be one of: high, medium, or low.',
      400,
      'INVALID_COMPRESSION_LEVEL',
    );
  }
  return level === 'small' ? 'low' : level;
}

async function readUploadedFile(file) {
  if (file.buffer) return toStandaloneBuffer(file.buffer);
  if (file.path) {
    const buffer = await fs.readFile(file.path);
    await cleanupUploadFile(file.path);
    return toStandaloneBuffer(buffer);
  }
  throw createClientError('No PDF file data received.', 400, 'MISSING_FILE_DATA');
}

function pdfName(value) {
  return value?.toString?.() || '';
}

function canReencodeImage(dict, metadata) {
  const colorSpace = pdfName(dict.get(PDFName.of('ColorSpace')));
  const hasSoftMask = Boolean(dict.get(PDFName.of('SMask')));
  const hasDecodeArray = Boolean(dict.get(PDFName.of('Decode')));

  if (hasSoftMask || hasDecodeArray || metadata.icc) return false;
  if (colorSpace === '/DeviceRGB') {
    return metadata.channels === 3 && metadata.space === 'srgb';
  }
  if (colorSpace === '/DeviceGray') {
    return metadata.channels === 1;
  }
  // DeviceCMYK and ICCBased images must not receive RGB replacement bytes.
  return false;
}

async function compressPdf(req, res) {
  const file = req.file;

  try {
    if (!file) {
      return res.status(400).json({ message: 'Please upload only one PDF.' });
    }

    const level = getCompressionLevel(req);
    const pdfBytes = await readUploadedFile(file);

    if (!hasPdfSignature(pdfBytes)) {
      throw createClientError('Please upload a valid PDF file.');
    }

    let pdfDoc;
    try {
      pdfDoc = await PDFDocument.load(pdfBytes);
    } catch (error) {
      if (error instanceof EncryptedPDFError || error.name === 'EncryptedPDFError') {
        throw createClientError(
          'Encrypted PDFs are not supported. Please remove the password and try again.',
          422,
          'ENCRYPTED_PDF_UNSUPPORTED',
        );
      }
      throw createClientError('Please upload a valid PDF file.');
    }

    if (pdfDoc.getPageCount() > MAX_PDF_PAGES) {
      throw createClientError(
        `PDFs are limited to ${MAX_PDF_PAGES} pages.`,
        413,
        'PDF_PAGE_LIMIT',
      );
    }

    const quality = level === 'high' ? 80 : level === 'low' ? 45 : 60;
    const maxWidth = level === 'high' ? 2000 : level === 'low' ? 1000 : 1400;

    // Strip document metadata on medium and low compression levels
    if (level === 'medium' || level === 'low' || level === 'small') {
      pdfDoc.setTitle('');
      pdfDoc.setAuthor('');
      pdfDoc.setSubject('');
      pdfDoc.setKeywords([]);
      pdfDoc.setProducer('');
      pdfDoc.setCreator('');
    }

    // Recompress embedded images in PDF streams
    for (const [ref, object] of pdfDoc.context.enumerateIndirectObjects()) {
      if (object instanceof PDFRawStream) {
        const dict = object.dict;
        const subtype = dict.get(PDFName.of('Subtype'));

        if (subtype === PDFName.of('Image')) {
          const filter = dict.get(PDFName.of('Filter'));
          const widthVal = pdfDoc.context.lookup(dict.get(PDFName.of('Width')));
          const heightVal = pdfDoc.context.lookup(dict.get(PDFName.of('Height')));
          const width = widthVal?.numberValue || widthVal?.asNumber?.() || 0;
          const height = heightVal?.numberValue || heightVal?.asNumber?.() || 0;

          const isJpeg = pdfName(filter).includes('/DCTDecode');

          if (isJpeg && object.contents && object.contents.length > 0) {
            try {
              const origBuf = Buffer.from(object.contents);
              const metadata = await sharp(origBuf).metadata();
              if (!canReencodeImage(dict, metadata)) continue;

              let pipeline = sharp(origBuf);

              if (width > maxWidth || height > maxWidth) {
                pipeline = pipeline.resize({
                  width: maxWidth,
                  height: maxWidth,
                  fit: 'inside',
                  withoutEnlargement: true,
                });
              }

              const { data: compressedImgBuf, info } = await pipeline
                .jpeg({ quality, mozjpeg: false })
                .toBuffer({ resolveWithObject: true });

              if (compressedImgBuf.length < origBuf.length) {
                object.contents = new Uint8Array(compressedImgBuf);
                dict.set(PDFName.of('Length'), PDFNumber.of(compressedImgBuf.length));
                dict.set(PDFName.of('Filter'), PDFName.of('DCTDecode'));
                dict.delete(PDFName.of('DecodeParms'));

                if ((width > maxWidth || height > maxWidth) && info?.width && info?.height) {
                  dict.set(PDFName.of('Width'), PDFNumber.of(info.width));
                  dict.set(PDFName.of('Height'), PDFNumber.of(info.height));
                }
              }
            } catch (err) {
              // Unsupported, malformed, or color-managed streams remain unchanged.
            }
          }
        }
      }
    }

    let compressedBytes;
    try {
      compressedBytes = await pdfDoc.save({ useObjectStreams: true });
      await PDFDocument.load(compressedBytes);
    } catch (error) {
      console.error('Compressed PDF validation failed:', error.message);
      compressedBytes = pdfBytes;
    }
    const finalBytes = compressedBytes.length < pdfBytes.length ? compressedBytes : pdfBytes;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', finalBytes.length);
    res.setHeader('Content-Disposition', 'inline; filename="compressed.pdf"');
    return res.send(Buffer.from(finalBytes));
  } catch (error) {
    if (file?.path) await cleanupUploadFile(file.path);
    if (error.isClientError) {
      return res.status(error.status || 422).json({ message: error.message });
    }
    console.error('Compress PDF Error:', error.message);
    return res.status(500).json({ message: 'Error compressing PDF file.' });
  }
}

module.exports = { compressPdf };
