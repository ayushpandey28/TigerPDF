const fs = require('fs/promises');
const { PDFDocument } = require('pdf-lib');
const { hasPdfSignature } = require('../utils/fileValidation');

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
      let pdfBytes = file.buffer;
      if (!pdfBytes && file.path) {
        pdfBytes = await fs.readFile(file.path);
        // Clean up disk file immediately after reading to free container disk space
        await cleanUpFile(file.path);
      }

      if (!pdfBytes || !hasPdfSignature(pdfBytes)) {
        await cleanUpFiles(files);
        return res.status(400).json({ message: 'Please upload valid PDF files.' });
      }

      let pdfDoc;
      try {
        pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
      } catch (error) {
        await cleanUpFiles(files);
        return res.status(400).json({ message: 'Please upload valid PDF files.' });
      }

      const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
      copiedPages.forEach((page) => {
        mergedPdf.addPage(page);
      });
    }

    const pdfBytes = await mergedPdf.save();

    // Clean up any remaining files safely
    await cleanUpFiles(files);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', pdfBytes.length);
    res.setHeader('Content-Disposition', 'inline; filename="merged.pdf"');
    return res.send(Buffer.from(pdfBytes));
  } catch (error) {
    console.error('Merge PDF Error:', error.message);
    if (files) await cleanUpFiles(files);
    return res.status(500).json({ message: 'Error merging PDF files.' });
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

module.exports = { mergePdf };
