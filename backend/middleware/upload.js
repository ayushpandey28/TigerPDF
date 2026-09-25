const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');

const uploadDir = path.join(os.tmpdir(), 'tigerpdf-uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

function clientError(message) {
  const err = new Error(message);
  err.isClientError = true;
  err.status = 400;
  return err;
}

// Disk storage for multi-file operations (Image to PDF, Merge PDF)
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = crypto.randomBytes(12).toString('hex') + ext;
    const fullPath = path.join(uploadDir, uniqueName);

    if (!req._uploadedFiles) req._uploadedFiles = [];
    req._uploadedFiles.push(fullPath);

    cb(null, uniqueName);
  },
});

const memoryStorage = multer.memoryStorage();

const allowedImageExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const allowedImageMimes = new Set([
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

  if (allowedImageExtensions.has(ext) || allowedImageMimes.has(mime)) {
    cb(null, true);
  } else {
    cb(clientError('Only JPG, PNG and WEBP images are allowed.'));
  }
}

const allowedPdfMimes = new Set([
  'application/pdf',
  'application/x-pdf',
  'application/acrobat',
  'applications/vnd.pdf',
  'text/pdf',
]);

function pdfFileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = (file.mimetype || '').toLowerCase();

  if (ext === '.pdf' || allowedPdfMimes.has(mime)) {
    cb(null, true);
  } else {
    cb(clientError('Only PDF files are allowed.'));
  }
}

const uploadImageArray = multer({
  storage: diskStorage,
  limits: { fileSize: 20 * 1024 * 1024, files: 50 },
  fileFilter: imageFileFilter,
});

const uploadPdfArray = multer({
  storage: diskStorage,
  limits: { fileSize: 20 * 1024 * 1024, files: 15 },
  fileFilter: pdfFileFilter,
});

const uploadSingleImage = multer({
  storage: memoryStorage,
  limits: { fileSize: 20 * 1024 * 1024, files: 1 },
  fileFilter: imageFileFilter,
});

const uploadSinglePdf = multer({
  storage: memoryStorage,
  limits: { fileSize: 20 * 1024 * 1024, files: 1 },
  fileFilter: pdfFileFilter,
});

module.exports = {
  uploadImage: uploadImageArray,
  uploadPdf: uploadPdfArray,
  uploadImageArray,
  uploadPdfArray,
  uploadSingleImage,
  uploadSinglePdf,
};