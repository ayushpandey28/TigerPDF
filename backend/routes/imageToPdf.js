const express = require('express');
const router = express.Router();
const { uploadImage } = require('../middleware/upload');
const { convertImageToPdf } = require('../controllers/imageToPdf');

// POST /api/image-to-pdf
router.post('/', uploadImage.array('images', 50), convertImageToPdf);

module.exports = router;
