const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Temporary upload directory path
const uploadDir = path.join(os.tmpdir(), 'tigerpdf-uploads');

// Startup cleanup: safely remove any leftover files from previous server runs
function cleanUploadsDir() {
  try {
    if (fs.existsSync(uploadDir)) {
      const files = fs.readdirSync(uploadDir);
      for (const file of files) {
        try {
          fs.unlinkSync(path.join(uploadDir, file));
        } catch (e) {}
      }
    } else {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
  } catch (err) {
    console.warn('Notice: Could not clean temporary upload directory on startup:', err.message);
  }
}
cleanUploadsDir();

// Non-blocking helper to delete temporary uploaded files
function cleanupReqFiles(req) {
  const pathsToClean = [];

  // Clean files tracked by upload middleware
  if (req._uploadedFiles && Array.isArray(req._uploadedFiles)) {
    pathsToClean.push(...req._uploadedFiles);
  }

  // Clean files attached to req.file
  if (req.file && req.file.path) {
    pathsToClean.push(req.file.path);
  }

  // Clean files attached to req.files
  if (req.files) {
    const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
    files.forEach((file) => {
      if (file && file.path) pathsToClean.push(file.path);
    });
  }

  // Use asynchronous unlink to avoid blocking the Node.js event loop
  pathsToClean.forEach((filePath) => {
    if (filePath) {
      fs.unlink(filePath, () => {});
    }
  });
}

// Middleware
app.use(cors({
  origin: '*',
  exposedHeaders: ['Content-Length', 'Content-Type', 'Content-Disposition'],
}));
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

// Health check endpoints (used by frontend to wake up Render free-tier containers)
app.get(['/', '/health', '/api', '/api/health'], (req, res) => {
  res.json({
    status: 'ok',
    message: 'TigerPDF Backend is running!',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// Global error handler for Multer and application errors
app.use((err, req, res, next) => {
  // Clean up any files Multer saved before erroring out
  cleanupReqFiles(req);

  // Handle Multer specific errors
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

  // Handle custom client/validation errors
  if (err.status === 400 || err.statusCode === 400 || err.isClientError) {
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
