const fs = require('fs/promises');
const sharp = require('sharp');
const { getImageFormat } = require('../utils/fileValidation');

// Compress image file
async function compressImage(req, res) {
  const file = req.file;

  try {
    if (!file) {
      return res.status(400).json({ message: 'Please upload only one image.' });
    }

    const level = req.body.level || 'medium';

    // Support both memory buffer (zero disk I/O) and disk storage fallback
    let inputBuffer;
    if (file.buffer) {
      inputBuffer = file.buffer;
    } else if (file.path) {
      inputBuffer = await fs.readFile(file.path);
      await cleanUpFile(file.path);
    } else {
      return res.status(400).json({ message: 'No image file data received.' });
    }

    const imageFormat = await getImageFormat(inputBuffer);

    if (!imageFormat) {
      return res.status(400).json({ message: 'Please upload a valid JPG, PNG or WEBP image.' });
    }

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
    if (imageFormat === 'png') {
      // Use palette quantization for lower quality levels to actually shrink PNG size
      const pngOptions = {
        compressionLevel: 6,
        quality: quality,
      };
      if (level === 'low' || level === 'medium') {
        pngOptions.palette = true;
      }
      compressedBuffer = await sharp(inputBuffer)
        .png(pngOptions)
        .toBuffer();
      outputType = 'image/png';

    } else if (imageFormat === 'webp') {
      compressedBuffer = await sharp(inputBuffer)
        .webp({ quality: quality })
        .toBuffer();
      outputType = 'image/webp';

    } else {
      // Fast standard libjpeg-turbo (mozjpeg: false) prevents CPU spikes on cloud containers
      compressedBuffer = await sharp(inputBuffer)
        .jpeg({ quality: quality, mozjpeg: false })
        .toBuffer();
      outputType = 'image/jpeg';
    }

    // If re-compressing didn't reduce size on high/medium, prefer the original
    const finalBuffer = (compressedBuffer.length < inputBuffer.length || level === 'low')
      ? compressedBuffer
      : inputBuffer;

    res.setHeader('Content-Type', outputType);
    res.setHeader('Content-Length', finalBuffer.length);
    res.setHeader('Content-Disposition', 'inline; filename="compressed-image"');
    return res.send(finalBuffer);
  } catch (error) {
    console.error('Compress Image Error:', error.message);
    if (file && file.path) await cleanUpFile(file.path);
    return res.status(500).json({ message: 'Error compressing image file.' });
  }
}

// Delete temporary file safely
async function cleanUpFile(filePath) {
  if (!filePath) return;
  try {
    await fs.unlink(filePath);
  } catch (e) {
    // File already deleted or doesn't exist
  }
}

module.exports = { compressImage };
