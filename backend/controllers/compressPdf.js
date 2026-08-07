const fs = require('fs');
const { PDFDocument } = require('pdf-lib');

// Compress PDF file
async function compressPdf(req, res) {
  try {
    const file = req.file;

    // Check if file exists
    if (!file) {
      return res.status(400).json({ message: 'Please upload only one PDF.' });
    }

    // Read PDF file
    const pdfBytes = fs.readFileSync(file.path);
    const pdfDoc = await PDFDocument.load(pdfBytes);

    // Compress PDF by saving with object streams enabled
    const compressedBytes = await pdfDoc.save({
      useObjectStreams: true,
    });

    // Clean up temporary file
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    // Send compressed PDF response
    res.setHeader('Content-Type', 'application/pdf');
    return res.send(Buffer.from(compressedBytes));
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(500).json({ message: 'Error compressing PDF file.' });
  }
}

module.exports = { compressPdf };
