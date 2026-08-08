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

// Where to save uploaded files
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Ensure directory still exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },

  filename: function (req, file, cb) {
    // Use random hex instead of user-supplied filename for safety
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = crypto.randomBytes(12).toString('hex') + ext;
    const fullPath = path.join(uploadDir, uniqueName);

    // Track every file path created on disk for this request (so error handlers can clean them up even if Multer fails mid-upload)
    if (!req._uploadedFiles) {
      req._uploadedFiles = [];
    }
    req._uploadedFiles.push(fullPath);

    cb(null, uniqueName);
  },
});

// Upload for images (max 20 MB per file)
const uploadImage = multer({
  storage: storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, PNG and WEBP images are allowed.'));
    }
  },
});

// Upload for PDF files (max 20 MB per file)
const uploadPdf = multer({
  storage: storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();

    if (ext === '.pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed.'));
    }
  },
});

module.exports = { uploadImage, uploadPdf };