const fs = require('fs/promises');
const sharp = require('sharp');

// Compress image file
async function compressImage(req, res) {
  const file = req.file;

  try {
    if (!file) {
      return res.status(400).json({ message: 'Please upload only one image.' });
    }

    const level = req.body.level || 'medium';

    // Read image into buffer and delete temporary disk file immediately to avoid Windows file locks
    const inputBuffer = await fs.readFile(file.path);
    await cleanUpFile(file.path);

    // Set quality based on compression level
    let quality;
    if (level === 'high') {
      quality = 85;
    } else if (level === 'low') {
      quality = 40;
    } else {
      quality = 65;
    }

    let compressedBuffer;
    let outputType;

    // Compress based on format using memory buffer
    if (file.mimetype === 'image/png') {
      compressedBuffer = await sharp(inputBuffer)
        .png({ compressionLevel: 6, quality: quality })
        .toBuffer();
      outputType = 'image/png';

    } else if (file.mimetype === 'image/webp') {
      compressedBuffer = await sharp(inputBuffer)
        .webp({ quality: quality })
        .toBuffer();
      outputType = 'image/webp';

    } else {
      compressedBuffer = await sharp(inputBuffer)
        .jpeg({ quality: quality, mozjpeg: true })
        .toBuffer();
      outputType = 'image/jpeg';
    }

    res.setHeader('Content-Type', outputType);
    return res.send(compressedBuffer);
  } catch (error) {
    console.error('Compress Image Error:', error.message);
    if (file) await cleanUpFile(file.path);
    return res.status(500).json({ message: 'Error compressing image file.' });
  }
}

// Delete temporary file safely
async function cleanUpFile(filePath) {
  try {
    await fs.unlink(filePath);
  } catch (e) {
    // File already deleted or doesn't exist
  }
}

module.exports = { compressImage };