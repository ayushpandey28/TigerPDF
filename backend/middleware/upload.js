const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Temporary upload directory
const uploadDir = path.join(os.tmpdir(), 'tigerpdf-uploads');

// Create directory if it doesn't exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Where to save uploaded files
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },

  filename: function (req, file, cb) {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  },
});

// Upload for images
const uploadImage = multer({
  storage: storage,

  limits: {
    fileSize: 100 * 1024 * 1024,
  },

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

// Upload for PDF files
const uploadPdf = multer({
  storage: storage,

  limits: {
    fileSize: 100 * 1024 * 1024,
  },

  fileFilter: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();

    if (ext === '.pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed.'));
    }
  },
});

module.exports = {
  uploadImage,
  uploadPdf,
};