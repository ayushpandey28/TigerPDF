const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const multer = require('multer');
const fs = require('fs');
const os = require('os');
const {
  cleanupUploadDirectory,
  cleanupUploadFiles,
  getUploadDir,
} = require('./middleware/upload');

dotenv.config();

const PORT = process.env.PORT || 5000;
const MAX_CONCURRENT_JOBS = Math.max(1, Number(process.env.MAX_CONCURRENT_JOBS) || 2);

function getRequestFiles(req) {
  const files = [];

  if (Array.isArray(req._uploadedFiles)) files.push(...req._uploadedFiles);
  if (req.file?.path) files.push(req.file.path);
  if (req.files) {
    const list = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
    list.forEach((file) => file?.path && files.push(file.path));
  }

  return files;
}

async function cleanupReqFiles(req) {
  await cleanupUploadFiles(getRequestFiles(req));

  if (req._uploadDir) {
    try {
      await fs.promises.rmdir(req._uploadDir);
    } catch (error) {
      if (!['ENOENT', 'ENOTEMPTY'].includes(error.code)) {
        console.warn('Could not remove request upload directory:', req._uploadDir, error.message);
      }
    }
  }
}

function processingGate(activeJobs) {
  return (req, res, next) => {
    if (activeJobs.count >= MAX_CONCURRENT_JOBS) {
      return res.status(429).json({
        message: 'The server is busy processing other files. Please try again shortly.',
      });
    }

    activeJobs.count += 1;
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      activeJobs.count -= 1;
    };

    res.once('finish', release);
    res.once('close', release);
    req.once('aborted', release);
    return next();
  };
}

function createApp() {
  const app = express();
  const activeJobs = { count: 0 };
  const gate = processingGate(activeJobs);

  app.use(cors({
    origin: '*',
    exposedHeaders: ['Content-Length', 'Content-Type', 'Content-Disposition'],
  }));

  // The API only accepts small JSON control payloads. Compressed JSON is not required.
  app.use(express.json({ limit: '100kb', inflate: false }));

  app.use((req, res, next) => {
    res.on('finish', () => {
      void cleanupReqFiles(req);
    });
    res.on('close', () => {
      if (!res.writableEnded) {
        void cleanupReqFiles(req);
      }
    });
    next();
  });

  app.use('/api/image-to-pdf', gate, require('./routes/imageToPdf'));
  app.use('/api/merge-pdf', gate, require('./routes/mergePdf'));
  app.use('/api/compress-pdf', gate, require('./routes/compressPdf'));
  app.use('/api/compress-image', gate, require('./routes/compressImage'));

  app.get(['/', '/health', '/api', '/api/health'], (req, res) => {
    res.json({
      status: 'ok',
      message: 'TigerPDF Backend is running!',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  });

  app.use((req, res) => {
    res.status(404).json({ message: 'Route not found.' });
  });

  app.use(async (err, req, res, next) => {
    await cleanupReqFiles(req);

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
      if (err.code === 'LIMIT_FIELD_COUNT' || err.code === 'LIMIT_PART_COUNT') {
        return res.status(400).json({
          message: 'Too many form fields were submitted for this operation.',
        });
      }
      if (err.code === 'LIMIT_FIELD_SIZE') {
        return res.status(413).json({
          message: 'A form field is larger than the supported limit.',
        });
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
          message: `Unexpected upload field: "${err.field}". Please check your form data.`,
        });
      }
      return res.status(400).json({ message: err.message });
    }

    if (err.type === 'entity.too.large') {
      return res.status(413).json({ message: 'The request body is too large.' });
    }

    if (err.type === 'encoding.unsupported') {
      return res.status(415).json({ message: 'Compressed request bodies are not supported.' });
    }

    const status = Number(err.statusCode || err.status);
    if (Number.isInteger(status) && status >= 400 && status < 500) {
      return res.status(status).json({ message: err.message || 'Invalid request.' });
    }

    console.error('Server error:', err.message);
    return res.status(500).json({
      message: 'Something went wrong on the server.',
    });
  });

  return app;
}

const app = createApp();

if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Temporary uploads are isolated at ${getUploadDir()}`);
  });

  let shuttingDown = false;
  const shutdown = () => {
    if (shuttingDown) return;
    shuttingDown = true;
    server.close(async () => {
      await cleanupUploadDirectory();
      process.exit(0);
    });
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

module.exports = { app, cleanupReqFiles, createApp };
