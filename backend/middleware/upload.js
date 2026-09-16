const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');

// Temporary upload directory
const uploadDir = path.join(os.tmpdir(), 'tigerpdf-uploads');

// Create directory if it doesn't exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Helper to create client-friendly 400 Bad Request error
function createFilterError(message) {
  const err = new Error(message);
  err.isClientError = true;
  err.status = 400;
  return err;
}

// Disk storage for multi-file operations (Image to PDF, Merge PDF)
const diskStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },

  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = crypto.randomBytes(12).toString('hex') + ext;
    const fullPath = path.join(uploadDir, uniqueName);

    if (!req._uploadedFiles) {
      req._uploadedFiles = [];
    }
    req._uploadedFiles.push(fullPath);

    cb(null, uniqueName);
  },
});

// Memory storage for single-file operations (eliminates disk I/O latency completely)
const memoryStorage = multer.memoryStorage();

// Allowed image MIME types and extensions
const allowedImageExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const allowedImageMimeTypes = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/x-png',
  'image/pjpeg',
]);

function imageFileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = (file.mimetype || '').toLowerCase();

  if (allowedImageExtensions.has(ext) || allowedImageMimeTypes.has(mime)) {
    cb(null, true);
  } else {
    cb(createFilterError('Only JPG, PNG and WEBP images are allowed.'));
  }
}

// Allowed PDF MIME types and extensions
const allowedPdfMimeTypes = new Set([
  'application/pdf',
  'application/x-pdf',
  'application/acrobat',
  'applications/vnd.pdf',
  'text/pdf',
]);

function pdfFileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = (file.mimetype || '').toLowerCase();

  if (ext === '.pdf' || allowedPdfMimeTypes.has(mime)) {
    cb(null, true);
  } else {
    cb(createFilterError('Only PDF files are allowed.'));
  }
}

// Upload for multi-image batch (max 20 MB per file, max 50 files)
const uploadImageArray = multer({
  storage: diskStorage,
  limits: { fileSize: 20 * 1024 * 1024, files: 50 },
  fileFilter: imageFileFilter,
});

// Upload for multi-PDF batch (max 20 MB per file, max 15 files)
const uploadPdfArray = multer({
  storage: diskStorage,
  limits: { fileSize: 20 * 1024 * 1024, files: 15 },
  fileFilter: pdfFileFilter,
});

// Upload for single image (in-memory buffer, zero disk I/O, max 20 MB)
const uploadSingleImage = multer({
  storage: memoryStorage,
  limits: { fileSize: 20 * 1024 * 1024, files: 1 },
  fileFilter: imageFileFilter,
});

// Upload for single PDF (in-memory buffer, zero disk I/O, max 20 MB)
const uploadSinglePdf = multer({
  storage: memoryStorage,
  limits: { fileSize: 20 * 1024 * 1024, files: 1 },
  fileFilter: pdfFileFilter,
});

// Backward-compatible exports
const uploadImage = uploadImageArray;
const uploadPdf = uploadPdfArray;

module.exports = {
  uploadImage,
  uploadPdf,
  uploadImageArray,
  uploadPdfArray,
  uploadSingleImage,
  uploadSinglePdf,
};