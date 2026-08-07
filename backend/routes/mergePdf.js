const express = require('express');
const router = express.Router();
const { uploadPdf } = require('../middleware/upload');
const { mergePdf } = require('../controllers/mergePdf');

// POST /api/merge-pdf
router.post('/', uploadPdf.array('pdfs', 15), mergePdf);

module.exports = router;
