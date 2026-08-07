const fs = require('fs');
const { PDFDocument } = require('pdf-lib');

// Merge multiple PDFs into one
async function mergePdf(req, res) {
  try {
    const files = req.files;

    // Check if files exist
    if (!files || files.length < 2) {
      if (files) cleanUpFiles(files);
      return res.status(400).json({ message: 'Please upload at least two PDF files.' });
    }

    // Check limit
    if (files.length > 15) {
      cleanUpFiles(files);
      return res.status(400).json({ message: 'Maximum 15 PDF files allowed.' });
    }

    // Create a new merged PDF
    const mergedPdf = await PDFDocument.create();

    // Loop through each PDF file
    for (const file of files) {
      const pdfBytes = fs.readFileSync(file.path);
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());

      copiedPages.forEach((page) => {
        mergedPdf.addPage(page);
      });
    }

    // Save merged PDF
    const pdfBytes = await mergedPdf.save();

    // Clean up temporary files
    cleanUpFiles(files);

    // Send PDF response
    res.setHeader('Content-Type', 'application/pdf');
    return res.send(Buffer.from(pdfBytes));
  } catch (error) {
    if (req.files) cleanUpFiles(req.files);
    return res.status(500).json({ message: 'Error merging PDF files.' });
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

module.exports = { mergePdf };
