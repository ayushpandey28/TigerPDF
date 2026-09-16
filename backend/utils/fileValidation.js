const sharp = require('sharp');

const supportedImageFormats = new Set(['jpeg', 'png', 'webp']);

async function getImageFormat(buffer) {
  try {
    const metadata = await sharp(buffer).metadata();
    return supportedImageFormats.has(metadata.format) ? metadata.format : null;
  } catch (error) {
    return null;
  }
}

function hasPdfSignature(buffer) {
  return buffer.subarray(0, 1024).includes(Buffer.from('%PDF-'));
}

module.exports = { getImageFormat, hasPdfSignature };
