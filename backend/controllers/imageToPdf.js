const fs = require('fs/promises');
const sharp = require('sharp');
const { PDFDocument } = require('pdf-lib');

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
      let imageBytes = await fs.readFile(file.path);
      let image;

      // pdf-lib only supports JPG and PNG, so convert WEBP to PNG first
      if (file.mimetype === 'image/webp') {
        imageBytes = await sharp(imageBytes).png().toBuffer();
        image = await pdfDoc.embedPng(imageBytes);
      } else if (file.mimetype === 'image/png') {
        image = await pdfDoc.embedPng(imageBytes);
      } else {
        image = await pdfDoc.embedJpg(imageBytes);
      }

      // Add page matching image size
      const page = pdfDoc.addPage([image.width, image.height]);
      page.drawImage(image, {
        x: 0,
        y: 0,
        width: image.width,
        height: image.height,
      });
    }

    const pdfBytes = await pdfDoc.save();

    await cleanUpFiles(files);

    res.setHeader('Content-Type', 'application/pdf');
    return res.send(Buffer.from(pdfBytes));
  } catch (error) {
    console.error('Image to PDF Error:', error.message);
    if (files) await cleanUpFiles(files);
    return res.status(500).json({ message: 'Error converting images to PDF.' });
  }
}

// Delete temporary files safely
async function cleanUpFiles(files) {
  for (const file of files) {
    try {
      await fs.unlink(file.path);
    } catch (e) {
      // File already deleted or doesn't exist
    }
  }
}

module.exports = { convertImageToPdf };
