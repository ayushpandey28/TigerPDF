const express = require('express');
const router = express.Router();
const {
  enforceAggregateSize,
  secureUploadedFiles,
  uploadPdf,
  validateAllowedFields,
} = require('../middleware/upload');
const { mergePdf } = require('../controllers/mergePdf');

// POST /api/merge-pdf
router.post(
  '/',
  uploadPdf.array('pdfs', 15),
  secureUploadedFiles,
  validateAllowedFields([]),
  enforceAggregateSize(100 * 1024 * 1024),
  mergePdf,
);

module.exports = router;
