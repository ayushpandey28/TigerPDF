const express = require('express');
const router = express.Router();
const { uploadSingleImage } = require('../middleware/upload');
const { compressImage } = require('../controllers/compressImage');

// POST /api/compress-image
router.post('/', uploadSingleImage.single('image'), compressImage);

module.exports = router;