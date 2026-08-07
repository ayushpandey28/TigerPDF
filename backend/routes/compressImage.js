const express = require('express');
const router = express.Router();
const { uploadImage } = require('../middleware/upload');
const { compressImage } = require('../controllers/compressImage');

// POST /api/compress-image
router.post('/', uploadImage.single('image'), compressImage);

module.exports = router;
