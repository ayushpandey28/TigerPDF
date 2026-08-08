const fs = require('fs/promises');
const { PDFDocument } = require('pdf-lib');

// Merge multiple PDFs into one
async function mergePdf(req, res) {
  const files = req.files;

  try {
    if (!files || files.length < 2) {
      if (files) await cleanUpFiles(files);
      return res.status(400).json({ message: 'Please upload at least two PDF files.' });
    }

    if (files.length > 15) {
      await cleanUpFiles(files);
      return res.status(400).json({ message: 'Maximum 15 PDF files allowed.' });
    }

    const mergedPdf = await PDFDocument.create();

    for (const file of files) {
      const pdfBytes = await fs.readFile(file.path);
      const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
      const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());

      copiedPages.forEach((page) => {
        mergedPdf.addPage(page);
      });
    }

    const pdfBytes = await mergedPdf.save();

    await cleanUpFiles(files);

    res.setHeader('Content-Type', 'application/pdf');
    return res.send(Buffer.from(pdfBytes));
  } catch (error) {
    console.error('Merge PDF Error:', error.message);
    if (files) await cleanUpFiles(files);
    return res.status(500).json({ message: 'Error merging PDF files.' });
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

module.exports = { mergePdf };
