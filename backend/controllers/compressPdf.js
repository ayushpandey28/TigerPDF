const fs = require('fs/promises');
const sharp = require('sharp');
const { PDFDocument, PDFName, PDFRawStream, PDFNumber } = require('pdf-lib');
const { hasPdfSignature } = require('../utils/fileValidation');

// Compress PDF file by recompressing embedded images and optimizing PDF structure
async function compressPdf(req, res) {
  const file = req.file;

  try {
    if (!file) {
      return res.status(400).json({ message: 'Please upload only one PDF.' });
    }

    const level = req.body.level || 'medium';

    // Support both memory buffer (zero disk I/O) and disk storage fallback
    let pdfBytes;
    if (file.buffer) {
      pdfBytes = file.buffer;
    } else if (file.path) {
      pdfBytes = await fs.readFile(file.path);
      await cleanUpFile(file.path);
    } else {
      return res.status(400).json({ message: 'No PDF file data received.' });
    }

    if (!hasPdfSignature(pdfBytes)) {
      return res.status(400).json({ message: 'Please upload a valid PDF file.' });
    }

    let pdfDoc;
    try {
      pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    } catch (error) {
      return res.status(400).json({ message: 'Please upload a valid PDF file.' });
    }

    // Set compression presets based on selected level
    let quality;
    let maxWidth;

    if (level === 'high') {
      quality = 80;
      maxWidth = 2000;
    } else if (level === 'low' || level === 'small') {
      quality = 45;
      maxWidth = 1000;
    } else {
      // Default to medium
      quality = 60;
      maxWidth = 1400;
    }

    // Strip document metadata on medium and low compression levels
    if (level === 'medium' || level === 'low' || level === 'small') {
      pdfDoc.setTitle('');
      pdfDoc.setAuthor('');
      pdfDoc.setSubject('');
      pdfDoc.setKeywords([]);
      pdfDoc.setProducer('');
      pdfDoc.setCreator('');
    }

    // Process embedded raster images inside PDF object streams
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

          const isJpeg = filter === PDFName.of('DCTDecode') || (Array.isArray(filter?.array) && filter.array.includes(PDFName.of('DCTDecode')));

          if (isJpeg && object.contents && object.contents.length > 0) {
            try {
              const origBuf = Buffer.from(object.contents);
              let pipeline = sharp(origBuf);

              // Resize if image width exceeds max width threshold
              if (width > maxWidth) {
                pipeline = pipeline.resize({ width: maxWidth, withoutEnlargement: true });
              }

              // Use fast standard libjpeg-turbo (mozjpeg: false) to prevent CPU starvation on deployed containers
              const { data: compressedImgBuf, info } = await pipeline
                .jpeg({ quality, mozjpeg: false })
                .toBuffer({ resolveWithObject: true });

              // Replace image stream only if output size is actually smaller
              if (compressedImgBuf.length < origBuf.length) {
                object.contents = new Uint8Array(compressedImgBuf);
                dict.set(PDFName.of('Length'), PDFNumber.of(compressedImgBuf.length));

                if (width > maxWidth && info && info.width) {
                  dict.set(PDFName.of('Width'), PDFNumber.of(info.width));
                  dict.set(PDFName.of('Height'), PDFNumber.of(info.height));
                }
              }
            } catch (err) {
              // Ignore corrupted or unparseable individual image streams
            }
          }
        }
      }
    }

    // Save PDF with object streams enabled for structural compression
    const compressedBytes = await pdfDoc.save({ useObjectStreams: true });

    // Never return a file larger than what the user uploaded
    const finalBytes = compressedBytes.length < pdfBytes.length ? compressedBytes : pdfBytes;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', finalBytes.length);
    res.setHeader('Content-Disposition', 'inline; filename="compressed.pdf"');
    return res.send(Buffer.from(finalBytes));
  } catch (error) {
    console.error('Compress PDF Error:', error.message);
    if (file && file.path) await cleanUpFile(file.path);
    return res.status(500).json({ message: 'Error compressing PDF file.' });
  }
}

// Delete temporary file safely
async function cleanUpFile(filePath) {
  if (!filePath) return;
  try {
    await fs.unlink(filePath);
  } catch (e) {
    // File already deleted or doesn't exist
  }
}

module.exports = { compressPdf };
