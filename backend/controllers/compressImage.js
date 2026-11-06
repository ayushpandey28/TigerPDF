const fs = require('fs/promises');
const sharp = require('sharp');
const {
  createClientError,
  getImageMetadata,
  isAnimatedImage,
  toStandaloneBuffer,
  validateImageMetadata,
} = require('../utils/fileValidation');
const { cleanupUploadFile } = require('../middleware/upload');

const compressionLevels = new Set(['high', 'medium', 'low', 'small']);

function getCompressionLevel(req) {
  const level = req.body?.level;
  if (typeof level !== 'string' || !compressionLevels.has(level)) {
    throw createClientError(
      'Compression level must be one of: high, medium, or low.',
      400,
      'INVALID_COMPRESSION_LEVEL',
    );
  }
  return level === 'small' ? 'low' : level;
}

async function readUploadedFile(file) {
  if (file.buffer) return toStandaloneBuffer(file.buffer);
  if (file.path) {
    const buffer = await fs.readFile(file.path);
    await cleanupUploadFile(file.path);
    return toStandaloneBuffer(buffer);
  }
  throw createClientError('No image file data received.', 400, 'MISSING_FILE_DATA');
}

async function compressImage(req, res) {
  const file = req.file;

  try {
    if (!file) {
      return res.status(400).json({ message: 'Please upload only one image.' });
    }

    const level = getCompressionLevel(req);
    const inputBuffer = await readUploadedFile(file);
    const metadata = await getImageMetadata(inputBuffer);
    if (!metadata) throw createClientError('Please upload a valid JPG, PNG or WEBP image.');
    validateImageMetadata(metadata);

    if (metadata.format === 'webp' && isAnimatedImage(metadata)) {
      throw createClientError(
        'Animated WebP images are not supported by image compression yet.',
        422,
        'ANIMATED_IMAGE_UNSUPPORTED',
      );
    }

    const imageFormat = metadata.format;

    const quality = level === 'high' ? 85 : level === 'low' ? 40 : 65;

    let compressedBuffer;
    let outputType;
    const image = sharp(inputBuffer).rotate();

    if (imageFormat === 'png') {
      const pngOptions = {
        compressionLevel: 6,
        quality,
        palette: level === 'low' || level === 'medium',
      };
      compressedBuffer = await image.png(pngOptions).toBuffer();
      outputType = 'image/png';
    } else if (imageFormat === 'webp') {
      compressedBuffer = await image.webp({ quality }).toBuffer();
      outputType = 'image/webp';
    } else {
      compressedBuffer = await image.jpeg({ quality, mozjpeg: false }).toBuffer();
      outputType = 'image/jpeg';
    }

    const finalBuffer = compressedBuffer.length < inputBuffer.length ? compressedBuffer : inputBuffer;
    const extension = outputType.split('/')[1] === 'jpeg' ? 'jpg' : outputType.split('/')[1];

    res.setHeader('Content-Type', outputType);
    res.setHeader('Content-Length', finalBuffer.length);
    res.setHeader('Content-Disposition', `inline; filename="compressed-image.${extension}"`);
    return res.send(finalBuffer);
  } catch (error) {
    if (file?.path) await cleanupUploadFile(file.path);
    if (error.isClientError) {
      return res.status(error.status || 422).json({ message: error.message });
    }
    console.error('Compress Image Error:', error.message);
    return res.status(500).json({ message: 'Error compressing image file.' });
  }
}

module.exports = { compressImage };
