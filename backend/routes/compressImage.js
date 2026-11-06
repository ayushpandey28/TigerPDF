const express = require('express');
const router = express.Router();
const {
  secureUploadedFiles,
  uploadSingleImage,
  validateAllowedFields,
} = require('../middleware/upload');
const { compressImage } = require('../controllers/compressImage');

// POST /api/compress-image
router.post(
  '/',
  uploadSingleImage.single('image'),
  secureUploadedFiles,
  validateAllowedFields(['level']),
  compressImage,
);

module.exports = router;
