const multer = require('multer');
const path = require('path');

// Where to save uploaded files
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  },
});

// Upload for images (JPG, PNG, WEBP)
const uploadImage = multer({
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB max
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
  limits: { fileSize: 100 * 1024 * 1024 }, // 20 MB max
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
