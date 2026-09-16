const fs = require('fs/promises');
const sharp = require('sharp');
const { PDFDocument } = require('pdf-lib');
const { getImageFormat } = require('../utils/fileValidation');

// Convert images to PDF
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

    for (const file of files) {
      let imageBytes = file.buffer;
      if (!imageBytes && file.path) {
        imageBytes = await fs.readFile(file.path);
        // Clean up immediately after reading to free disk space
        await cleanUpFile(file.path);
      }

      const imageFormat = await getImageFormat(imageBytes);

      if (!imageFormat) {
        await cleanUpFiles(files);
        return res.status(400).json({ message: 'Please upload valid JPG, PNG or WEBP images.' });
      }

      let image;
      if (imageFormat === 'webp') {
        // Check if image has transparency; if not, convert to JPEG for 3x faster embedding and smaller PDF size
        const meta = await sharp(imageBytes).metadata();
        if (meta.hasAlpha) {
          imageBytes = await sharp(imageBytes).png().toBuffer();
          image = await pdfDoc.embedPng(imageBytes);
        } else {
          imageBytes = await sharp(imageBytes).jpeg({ quality: 85 }).toBuffer();
          image = await pdfDoc.embedJpg(imageBytes);
        }
      } else if (imageFormat === 'png') {
        image = await pdfDoc.embedPng(imageBytes);
      } else {
        image = await pdfDoc.embedJpg(imageBytes);
      }

      // Add page matching image dimensions
      const page = pdfDoc.addPage([image.width, image.height]);
      page.drawImage(image, {
        x: 0,
        y: 0,
        width: image.width,
        height: image.height,
      });
    }

    const pdfBytes = await pdfDoc.save();

    // Ensure any remaining files are cleaned
    await cleanUpFiles(files);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', pdfBytes.length);
    res.setHeader('Content-Disposition', 'inline; filename="converted.pdf"');
    return res.send(Buffer.from(pdfBytes));
  } catch (error) {
    console.error('Image to PDF Error:', error.message);
    if (files) await cleanUpFiles(files);
    return res.status(500).json({ message: 'Error converting images to PDF.' });
  }
}

// Delete single temporary file safely
async function cleanUpFile(filePath) {
  if (!filePath) return;
  try {
    await fs.unlink(filePath);
  } catch (e) {}
}

// Delete temporary files safely
async function cleanUpFiles(files) {
  if (!files || !Array.isArray(files)) return;
  for (const file of files) {
    if (file && file.path) {
      await cleanUpFile(file.path);
    }
  }
}

module.exports = { convertImageToPdf };
