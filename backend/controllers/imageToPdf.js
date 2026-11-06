const fs = require('fs/promises');
const sharp = require('sharp');
const { PDFDocument } = require('pdf-lib');
const {
  createClientError,
  getImageMetadata,
  isAnimatedImage,
  toStandaloneBuffer,
  validateImageMetadata,
} = require('../utils/fileValidation');
const { cleanupUploadFile } = require('../middleware/upload');

const MAX_TOTAL_IMAGE_PIXELS = 120_000_000;

async function cleanUpFiles(files) {
  if (!Array.isArray(files)) return;
  for (const file of files) {
    if (file?.path) await cleanupUploadFile(file.path);
  }
}

async function convertImageToPdf(req, res) {
  const files = req.files;

  try {
    if (!files || files.length === 0) {
      return res.status(400).json({ message: 'Please upload at least one image.' });
    }

    if (files.length > 50) {
      await cleanUpFiles(files);
      return res.status(400).json({ message: 'Maximum 50 images allowed.' });
    }

    const pdfDoc = await PDFDocument.create();
    let totalPixels = 0;

    for (const file of files) {
      let imageBytes = file.buffer ? toStandaloneBuffer(file.buffer) : null;
      if (!imageBytes && file.path) {
        imageBytes = toStandaloneBuffer(await fs.readFile(file.path));
        await cleanupUploadFile(file.path);
      }
      if (!imageBytes) {
        throw createClientError('No image file data received.', 400, 'MISSING_FILE_DATA');
      }

      const metadata = await getImageMetadata(imageBytes);
      if (!metadata) throw createClientError('Please upload a valid JPG, PNG or WEBP image.');
      validateImageMetadata(metadata);
      if (metadata.format === 'webp' && isAnimatedImage(metadata)) {
        throw createClientError(
          'Animated WebP images are not supported by image-to-PDF yet.',
          422,
          'ANIMATED_IMAGE_UNSUPPORTED',
        );
      }

      totalPixels += metadata.width * (metadata.pageHeight || metadata.height) * (metadata.pages || 1);
      if (totalPixels > MAX_TOTAL_IMAGE_PIXELS) {
        throw createClientError(
          `The combined image dimensions cannot exceed ${MAX_TOTAL_IMAGE_PIXELS.toLocaleString()} pixels.`,
          413,
          'TOTAL_IMAGE_PIXELS_TOO_LARGE',
        );
      }

      let image;
      const needsOrientation = metadata.orientation && metadata.orientation !== 1;

      if (metadata.format === 'webp') {
        const imagePipeline = sharp(imageBytes).rotate();
        if (metadata.hasAlpha) {
          const pngBytes = await imagePipeline.png().toBuffer();
          image = await pdfDoc.embedPng(pngBytes);
        } else {
          const jpegBytes = toStandaloneBuffer(await imagePipeline.jpeg({ quality: 85 }).toBuffer());
          image = await pdfDoc.embedJpg(jpegBytes);
        }
      } else if (metadata.format === 'png') {
        const pngBytes = needsOrientation
          ? await sharp(imageBytes).rotate().png().toBuffer()
          : toStandaloneBuffer(imageBytes);
        image = await pdfDoc.embedPng(pngBytes);
      } else {
        const jpegBytes = needsOrientation
          ? toStandaloneBuffer(await sharp(imageBytes).rotate().jpeg({ quality: 100 }).toBuffer())
          : toStandaloneBuffer(imageBytes);
        image = await pdfDoc.embedJpg(jpegBytes);
      }

      const page = pdfDoc.addPage([image.width, image.height]);
      page.drawImage(image, {
        x: 0,
        y: 0,
        width: image.width,
        height: image.height,
      });
    }

    const pdfBytes = await pdfDoc.save();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', pdfBytes.length);
    res.setHeader('Content-Disposition', 'inline; filename="converted.pdf"');
    return res.send(Buffer.from(pdfBytes));
  } catch (error) {
    if (error.isClientError) {
      return res.status(error.status || 422).json({ message: error.message });
    }
    console.error('Image to PDF Error:', error.message);
    return res.status(500).json({ message: 'Error converting images to PDF.' });
  } finally {
    if (files) await cleanUpFiles(files);
  }
}

module.exports = { convertImageToPdf };
