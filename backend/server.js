const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const multer = require('multer');
const fs = require('fs');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Helper to delete temporary uploaded files if request fails or is aborted
function cleanupReqFiles(req) {
  // Clean files tracked by upload middleware
  if (req._uploadedFiles && Array.isArray(req._uploadedFiles)) {
    req._uploadedFiles.forEach((filePath) => {
      if (filePath && fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (e) {}
      }
    });
  }

  // Clean files attached to req.file
  if (req.file && req.file.path) {
    try {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    } catch (e) {}
  }

  // Clean files attached to req.files
  if (req.files) {
    const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
    files.forEach((file) => {
      if (file && file.path) {
        try {
          if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        } catch (e) {}
      }
    });
  }
}

// Middleware
app.use(cors());
app.use(express.json());

// Cleanup temporary files if request is aborted by client mid-stream
app.use((req, res, next) => {
  res.on('close', () => {
    if (!res.writableEnded) {
      cleanupReqFiles(req);
    }
  });
  next();
});

// Routes
const imageToPdfRoute = require('./routes/imageToPdf');
const mergePdfRoute = require('./routes/mergePdf');
const compressPdfRoute = require('./routes/compressPdf');
const compressImageRoute = require('./routes/compressImage');

app.use('/api/image-to-pdf', imageToPdfRoute);
app.use('/api/merge-pdf', mergePdfRoute);
app.use('/api/compress-pdf', compressPdfRoute);
app.use('/api/compress-image', compressImageRoute);

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'TigerPDF Backend is running!' });
});

// Global error handler for Multer and other errors
app.use((err, req, res, next) => {
  // Clean up any files Multer saved before erroring out
  cleanupReqFiles(req);

  // Handle Multer file-size errors
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        message: 'This file is larger than the supported limit.',
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        message: 'Too many files uploaded.',
      });
    }
    return res.status(400).json({ message: err.message });
  }

  // Handle file-filter errors from Multer
  if (err.message && err.message.includes('Only')) {
    return res.status(400).json({ message: err.message });
  }

  // Generic server error
  console.error('Server Error:', err.message);
  return res.status(500).json({
    message: 'Something went wrong on the server.',
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
