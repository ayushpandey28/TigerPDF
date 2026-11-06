const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const { createClientError } = require('../utils/fileValidation');

const uploadRoot = path.join(os.tmpdir(), 'tigerpdf-uploads');
const uploadDir = path.join(
  uploadRoot,
  `${process.pid}-${crypto.randomBytes(8).toString('hex')}`,
);
const activeUploadFiles = new Set();

fs.mkdirSync(uploadDir, { recursive: true, mode: 0o700 });

function ensureRequestUploadDir(req) {
  if (!req._uploadDir) {
    req._uploadDir = path.join(uploadDir, crypto.randomBytes(12).toString('hex'));
    fs.mkdirSync(req._uploadDir, { recursive: true, mode: 0o700 });
  }
  return req._uploadDir;
}

function isOwnedUpload(filePath) {
  if (!filePath) return false;
  const relative = path.relative(uploadDir, path.resolve(filePath));
  return relative && !relative.startsWith('..') && !path.isAbsolute(relative);
}

async function cleanupUploadFile(filePath) {
  activeUploadFiles.delete(filePath);
  if (!isOwnedUpload(filePath)) return;

  try {
    await fs.promises.unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn('Could not remove temporary upload:', filePath, error.message);
    }
  }
}

async function cleanupUploadFiles(filePaths) {
  const uniquePaths = [...new Set((filePaths || []).filter(Boolean))];
  await Promise.all(uniquePaths.map((filePath) => cleanupUploadFile(filePath)));
}

async function cleanupUploadDirectory() {
  try {
    await fs.promises.rm(uploadDir, { recursive: true, force: true });
  } catch (error) {
    console.warn('Could not remove temporary upload directory:', uploadDir, error.message);
  }
}

async function secureUploadedFiles(req, res, next) {
  const files = [];
  if (req.file) files.push(req.file);
  if (Array.isArray(req.files)) files.push(...req.files);

  try {
    await Promise.all(files.filter((file) => file.path).map(async (file) => {
      await fs.promises.chmod(file.path, 0o600);
    }));
    next();
  } catch (error) {
    next(error);
  }
}

function validateAllowedFields(allowedFields) {
  const allowed = new Set(allowedFields);

  return (req, res, next) => {
    const fields = req.body || {};
    const unexpected = Object.keys(fields).find((field) => !allowed.has(field));
    if (unexpected) {
      return next(createClientError(`Unexpected form field: "${unexpected}".`, 400, 'UNEXPECTED_FIELD'));
    }

    for (const [field, value] of Object.entries(fields)) {
      if (Array.isArray(value) || typeof value !== 'string') {
        return next(createClientError(`Invalid value for form field: "${field}".`, 400, 'INVALID_FIELD'));
      }
    }

    return next();
  };
}

function enforceAggregateSize(maxBytes) {
  return (req, res, next) => {
    const files = [];
    if (req.file) files.push(req.file);
    if (Array.isArray(req.files)) files.push(...req.files);
    const totalBytes = files.reduce((total, file) => total + (file.size || 0), 0);

    if (totalBytes > maxBytes) {
      return next(createClientError(
        `The combined upload size cannot exceed ${Math.floor(maxBytes / (1024 * 1024))} MB.`,
        413,
        'TOTAL_UPLOAD_SIZE',
      ));
    }

    return next();
  };
}

// Disk storage for multi-file operations (Image to PDF, Merge PDF)
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      cb(null, ensureRequestUploadDir(req));
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = crypto.randomBytes(12).toString('hex') + ext;
    const fullPath = path.join(ensureRequestUploadDir(req), uniqueName);

    if (!req._uploadedFiles) req._uploadedFiles = [];
    req._uploadedFiles.push(fullPath);
    activeUploadFiles.add(fullPath);

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
    cb(createClientError('Only JPG, PNG and WEBP images are allowed.', 400, 'UNSUPPORTED_IMAGE'));
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
    cb(createClientError('Only PDF files are allowed.', 400, 'UNSUPPORTED_PDF'));
  }
}

const uploadImageArray = multer({
  storage: diskStorage,
  limits: {
    fileSize: 20 * 1024 * 1024,
    files: 50,
    fields: 0,
    parts: 50,
    fieldNameSize: 100,
    fieldSize: 1024,
  },
  fileFilter: imageFileFilter,
});

const uploadPdfArray = multer({
  storage: diskStorage,
  limits: {
    fileSize: 20 * 1024 * 1024,
    files: 15,
    fields: 0,
    parts: 15,
    fieldNameSize: 100,
    fieldSize: 1024,
  },
  fileFilter: pdfFileFilter,
});

const uploadSingleImage = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 20 * 1024 * 1024,
    files: 1,
    fields: 1,
    parts: 2,
    fieldNameSize: 100,
    fieldSize: 1024,
  },
  fileFilter: imageFileFilter,
});

const uploadSinglePdf = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 20 * 1024 * 1024,
    files: 1,
    fields: 1,
    parts: 2,
    fieldNameSize: 100,
    fieldSize: 1024,
  },
  fileFilter: pdfFileFilter,
});

module.exports = {
  cleanupUploadDirectory,
  cleanupUploadFile,
  cleanupUploadFiles,
  enforceAggregateSize,
  getUploadDir: () => uploadDir,
  secureUploadedFiles,
  validateAllowedFields,
  uploadImage: uploadImageArray,
  uploadPdf: uploadPdfArray,
  uploadImageArray,
  uploadPdfArray,
  uploadSingleImage,
  uploadSinglePdf,
};
