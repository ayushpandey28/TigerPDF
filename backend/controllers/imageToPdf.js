const fs = require('fs');
const { PDFDocument } = require('pdf-lib');

// Convert images to PDF
async function convertImageToPdf(req, res) {
  try {
    const files = req.files;

    // Check if files exist
    if (!files || files.length === 0) {
      return res.status(400).json({ message: 'Please upload at least one image.' });
    }

    // Check file limit
    if (files.length > 50) {
      cleanUpFiles(files);
      return res.status(400).json({ message: 'Maximum 50 images allowed.' });
    }

    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();

    // Process each image
    for (const file of files) {
      const imageBytes = fs.readFileSync(file.path);
      let image;

      // Embed image based on file type
      if (file.mimetype === 'image/png') {
        image = await pdfDoc.embedPng(imageBytes);
      } else {
        image = await pdfDoc.embedJpg(imageBytes);
      }

      // Add page with image dimensions
      const page = pdfDoc.addPage([image.width, image.height]);
      page.drawImage(image, {
        x: 0,
        y: 0,
        width: image.width,
        height: image.height,
      });
    }

    // Save PDF to buffer
    const pdfBytes = await pdfDoc.save();

    // Clean up temporary files
    cleanUpFiles(files);

    // Send PDF response
    res.setHeader('Content-Type', 'application/pdf');
    return res.send(Buffer.from(pdfBytes));
  } catch (error) {
    if (req.files) cleanUpFiles(req.files);
    return res.status(500).json({ message: 'Error converting images to PDF.' });
  }
}

// Helper to delete uploaded files
function cleanUpFiles(files) {
  files.forEach((file) => {
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
  });
}

module.exports = { convertImageToPdf };
