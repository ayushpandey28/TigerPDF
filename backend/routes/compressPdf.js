const express = require('express');
const router = express.Router();

const { uploadSinglePdf } = require('../middleware/upload');
const { compressPdf } = require('../controllers/compressPdf');

// POST /api/compress-pdf
router.post('/', uploadSinglePdf.single('pdf'), compressPdf);

module.exports = router;