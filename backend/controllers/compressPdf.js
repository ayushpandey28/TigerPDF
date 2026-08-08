const fs = require('fs/promises');
const sharp = require('sharp');
const { PDFDocument, PDFName, PDFRawStream, PDFNumber } = require('pdf-lib');

// Compress PDF file by recompressing embedded images and optimizing PDF structure
async function compressPdf(req, res) {
  const file = req.file;

  try {
    if (!file) {
      return res.status(400).json({ message: 'Please upload only one PDF.' });
    }

    const level = req.body.level || 'medium';

    // Read PDF file into buffer and clean up temporary disk file
    const pdfBytes = await fs.readFile(file.path);
    await cleanUpFile(file.path);

    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });

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
          const width = dict.get(PDFName.of('Width'))?.numberValue || 0;
          const height = dict.get(PDFName.of('Height'))?.numberValue || 0;

          const isJpeg = filter === PDFName.of('DCTDecode') || (Array.isArray(filter?.array) && filter.array.includes(PDFName.of('DCTDecode')));

          if (isJpeg && object.contents && object.contents.length > 0) {
            try {
              const origBuf = Buffer.from(object.contents);
              let pipeline = sharp(origBuf);

              // Resize if image width exceeds max width threshold
              if (width > maxWidth) {
                pipeline = pipeline.resize({ width: maxWidth, withoutEnlargement: true });
              }

              const compressedImgBuf = await pipeline.jpeg({ quality, mozjpeg: true }).toBuffer();

              // Replace image stream only if output size is actually smaller
              if (compressedImgBuf.length < origBuf.length) {
                object.contents = new Uint8Array(compressedImgBuf);
                dict.set(PDFName.of('Length'), PDFNumber.of(compressedImgBuf.length));

                if (width > maxWidth) {
                  const meta = await sharp(compressedImgBuf).metadata();
                  dict.set(PDFName.of('Width'), PDFNumber.of(meta.width || width));
                  dict.set(PDFName.of('Height'), PDFNumber.of(meta.height || height));
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

    res.setHeader('Content-Type', 'application/pdf');
    return res.send(Buffer.from(compressedBytes));
  } catch (error) {
    console.error('Compress PDF Error:', error.message);
    if (file) await cleanUpFile(file.path);
    return res.status(500).json({ message: 'Error compressing PDF file.' });
  }
}

// Delete temporary file safely
async function cleanUpFile(filePath) {
  try {
    await fs.unlink(filePath);
  } catch (e) {
    // File already deleted or doesn't exist
  }
}

module.exports = { compressPdf };