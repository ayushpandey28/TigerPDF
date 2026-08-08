const express = require('express');
const router = express.Router();

const { uploadPdf } = require('../middleware/upload');
const { compressPdf } = require('../controllers/compressPdf');

// POST /api/compress-pdf
router.post('/', uploadPdf.single('pdf'), compressPdf);

module.exports = router;