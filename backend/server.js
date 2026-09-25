const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const os = require('os');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const uploadDir = path.join(os.tmpdir(), 'tigerpdf-uploads');

// Ensure upload directory exists and clean stale files on startup
try {
  if (fs.existsSync(uploadDir)) {
    fs.readdirSync(uploadDir).forEach((file) => {
      try {
        fs.unlinkSync(path.join(uploadDir, file));
      } catch (e) {}
    });
  } else {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
} catch (err) {
  console.warn('Could not clean temp upload dir on startup:', err.message);
}

// Clean up temporary files associated with the request
function cleanupReqFiles(req) {
  const filesToClean = [];

  if (Array.isArray(req._uploadedFiles)) {
    filesToClean.push(...req._uploadedFiles);
  }
  if (req.file?.path) {
    filesToClean.push(req.file.path);
  }
  if (req.files) {
    const list = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
    list.forEach((f) => f?.path && filesToClean.push(f.path));
  }

  filesToClean.forEach((filePath) => {
    if (filePath) fs.unlink(filePath, () => {});
  });
}

app.use(cors({
  origin: '*',
  exposedHeaders: ['Content-Length', 'Content-Type', 'Content-Disposition'],
}));
app.use(express.json());

// Cleanup temporary files if client closes connection early
app.use((req, res, next) => {
  res.on('close', () => {
    if (!res.writableEnded) {
      cleanupReqFiles(req);
    }
  });
  next();
});

// Routes
app.use('/api/image-to-pdf', require('./routes/imageToPdf'));
app.use('/api/merge-pdf', require('./routes/mergePdf'));
app.use('/api/compress-pdf', require('./routes/compressPdf'));
app.use('/api/compress-image', require('./routes/compressImage'));

// Health checks
app.get(['/', '/health', '/api', '/api/health'], (req, res) => {
  res.json({
    status: 'ok',
    message: 'TigerPDF Backend is running!',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// Global error handler
app.use((err, req, res, next) => {
  cleanupReqFiles(req);

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        message: 'This file is larger than the supported 20 MB limit.',
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        message: 'Too many files uploaded for this operation.',
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        message: `Unexpected upload field: "${err.field}". Please check your form data.`,
      });
    }
    return res.status(400).json({ message: err.message });
  }

  if (err.status === 400 || err.statusCode === 400 || err.isClientError) {
    return res.status(400).json({ message: err.message });
  }

  console.error('Server error:', err.message);
  return res.status(500).json({
    message: 'Something went wrong on the server.',
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
