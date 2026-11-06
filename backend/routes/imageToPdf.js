const express = require('express');
const router = express.Router();
const {
  enforceAggregateSize,
  secureUploadedFiles,
  uploadImage,
  validateAllowedFields,
} = require('../middleware/upload');
const { convertImageToPdf } = require('../controllers/imageToPdf');

// POST /api/image-to-pdf
router.post(
  '/',
  uploadImage.array('images', 50),
  secureUploadedFiles,
  validateAllowedFields([]),
  enforceAggregateSize(100 * 1024 * 1024),
  convertImageToPdf,
);

module.exports = router;
