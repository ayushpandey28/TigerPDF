const fs = require('fs/promises');
const sharp = require('sharp');
const { getImageFormat } = require('../utils/fileValidation');

async function compressImage(req, res) {
  const file = req.file;

  try {
    if (!file) {
      return res.status(400).json({ message: 'Please upload only one image.' });
    }

    const level = req.body.level || 'medium';

    let inputBuffer;
    if (file.buffer) {
      inputBuffer = file.buffer;
    } else if (file.path) {
      inputBuffer = await fs.readFile(file.path);
      await fs.unlink(file.path).catch(() => {});
    } else {
      return res.status(400).json({ message: 'No image file data received.' });
    }

    const imageFormat = await getImageFormat(inputBuffer);
    if (!imageFormat) {
      return res.status(400).json({ message: 'Please upload a valid JPG, PNG or WEBP image.' });
    }

    const quality = level === 'high' ? 85 : level === 'low' ? 40 : 65;

    let compressedBuffer;
    let outputType;

    if (imageFormat === 'png') {
      const pngOptions = {
        compressionLevel: 6,
        quality,
        palette: level === 'low' || level === 'medium',
      };
      compressedBuffer = await sharp(inputBuffer).png(pngOptions).toBuffer();
      outputType = 'image/png';
    } else if (imageFormat === 'webp') {
      compressedBuffer = await sharp(inputBuffer).webp({ quality }).toBuffer();
      outputType = 'image/webp';
    } else {
      compressedBuffer = await sharp(inputBuffer).jpeg({ quality, mozjpeg: false }).toBuffer();
      outputType = 'image/jpeg';
    }

    const finalBuffer = (compressedBuffer.length < inputBuffer.length || level === 'low')
      ? compressedBuffer
      : inputBuffer;

    res.setHeader('Content-Type', outputType);
    res.setHeader('Content-Length', finalBuffer.length);
    res.setHeader('Content-Disposition', 'inline; filename="compressed-image"');
    return res.send(finalBuffer);
  } catch (error) {
    console.error('Compress Image Error:', error.message);
    if (file?.path) await fs.unlink(file.path).catch(() => {});
    return res.status(500).json({ message: 'Error compressing image file.' });
  }
}

module.exports = { compressImage };
