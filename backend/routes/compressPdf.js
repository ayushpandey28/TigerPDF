const express = require('express');
const router = express.Router();

const {
  secureUploadedFiles,
  uploadSinglePdf,
  validateAllowedFields,
} = require('../middleware/upload');
const { compressPdf } = require('../controllers/compressPdf');

// POST /api/compress-pdf
router.post(
  '/',
  uploadSinglePdf.single('pdf'),
  secureUploadedFiles,
  validateAllowedFields(['level']),
  compressPdf,
);

module.exports = router;
