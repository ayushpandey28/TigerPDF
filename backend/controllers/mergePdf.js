const fs = require('fs/promises');
const { EncryptedPDFError, PDFDocument } = require('pdf-lib');
const {
  MAX_PDF_PAGES,
  createClientError,
  hasPdfSignature,
  toStandaloneBuffer,
} = require('../utils/fileValidation');
const { cleanupUploadFile } = require('../middleware/upload');

async function cleanUpFiles(files) {
  if (!Array.isArray(files)) return;
  for (const file of files) {
    if (file?.path) await cleanupUploadFile(file.path);
  }
}

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
    let totalPages = 0;

    for (const file of files) {
      let pdfBytes = file.buffer ? toStandaloneBuffer(file.buffer) : null;
      if (!pdfBytes && file.path) {
        pdfBytes = toStandaloneBuffer(await fs.readFile(file.path));
        await cleanupUploadFile(file.path);
      }

      if (!pdfBytes) throw createClientError('No PDF file data received.', 400, 'MISSING_FILE_DATA');
      if (!hasPdfSignature(pdfBytes)) throw createClientError('Please upload a valid PDF file.');

      let pdfDoc;
      try {
        pdfDoc = await PDFDocument.load(pdfBytes);
      } catch (error) {
        if (error instanceof EncryptedPDFError || error.name === 'EncryptedPDFError') {
          throw createClientError(
            'Encrypted PDFs are not supported. Please remove the password and try again.',
            422,
            'ENCRYPTED_PDF_UNSUPPORTED',
          );
        }
        throw createClientError('Please upload a valid PDF file.');
      }

      const pageCount = pdfDoc.getPageCount();
      if (pageCount > MAX_PDF_PAGES) {
        throw createClientError(
          `Each PDF is limited to ${MAX_PDF_PAGES} pages.`,
          413,
          'PDF_PAGE_LIMIT',
        );
      }

      totalPages += pageCount;
      if (totalPages > MAX_PDF_PAGES) {
        throw createClientError(
          `Merged PDFs are limited to ${MAX_PDF_PAGES} total pages.`,
          413,
          'TOTAL_PDF_PAGE_LIMIT',
        );
      }

      if (pdfDoc.getForm().getFields().length > 0) {
        throw createClientError(
          'PDF forms are not supported during merging because their fields cannot be preserved safely.',
          422,
          'PDF_FORMS_UNSUPPORTED',
        );
      }

      const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
      copiedPages.forEach((page) => mergedPdf.addPage(page));
    }

    const pdfBytes = await mergedPdf.save();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', pdfBytes.length);
    res.setHeader('Content-Disposition', 'inline; filename="merged.pdf"');
    return res.send(Buffer.from(pdfBytes));
  } catch (error) {
    if (error.isClientError) {
      return res.status(error.status || 422).json({ message: error.message });
    }
    console.error('Merge PDF Error:', error.message);
    return res.status(500).json({ message: 'Error merging PDF files.' });
  } finally {
    if (files) await cleanUpFiles(files);
  }
}

module.exports = { mergePdf };
