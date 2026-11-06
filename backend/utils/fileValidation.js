const sharp = require('sharp');

const supportedImageFormats = new Set(['jpeg', 'png', 'webp']);
const MAX_IMAGE_PIXELS = 40_000_000;
const MAX_IMAGE_FRAMES = 1;
const MAX_PDF_PAGES = 200;

function createClientError(message, status = 422, code = 'INVALID_FILE') {
  const error = new Error(message);
  error.status = status;
  error.statusCode = status;
  error.code = code;
  error.isClientError = true;
  return error;
}

function toStandaloneBuffer(value) {
  if (!Buffer.isBuffer(value) && !(value instanceof Uint8Array)) {
    throw new TypeError('Expected a byte buffer.');
  }

  const source = Buffer.isBuffer(value) ? value : Buffer.from(value);
  const copy = Buffer.from(new ArrayBuffer(source.byteLength));
  source.copy(copy);
  return copy;
}

function getImageSignature(buffer) {
  const bytes = toStandaloneBuffer(buffer);

  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'jpeg';
  }

  if (
    bytes.length >= 8
    && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return 'png';
  }

  if (
    bytes.length >= 12
    && bytes.subarray(0, 4).toString('ascii') === 'RIFF'
    && bytes.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'webp';
  }

  return null;
}

async function getImageMetadata(buffer) {
  const bytes = toStandaloneBuffer(buffer);
  const signatureFormat = getImageSignature(bytes);

  // Do not send unsupported formats such as SVG/GIF to a native decoder.
  if (!signatureFormat) return null;

  try {
    const metadata = await sharp(bytes).metadata();
    if (metadata.format !== signatureFormat || !supportedImageFormats.has(metadata.format)) {
      return null;
    }
    // Metadata can be read from a truncated container. Decode enough of the
    // image to ensure malformed bytes are reported as client input errors.
    await sharp(bytes).stats();
    return metadata;
  } catch (error) {
    return null;
  }
}

async function getImageFormat(buffer) {
  const metadata = await getImageMetadata(buffer);
  return metadata?.format || null;
}

function validateImageMetadata(metadata) {
  if (!metadata?.width || !metadata?.height) {
    throw createClientError('The uploaded image has no valid dimensions.');
  }

  const pages = metadata.pages || 1;
  const pageHeight = metadata.pageHeight || metadata.height;
  const pixels = metadata.width * pageHeight * pages;

  if (!Number.isFinite(pixels) || pixels > MAX_IMAGE_PIXELS) {
    throw createClientError(
      `Images are limited to ${MAX_IMAGE_PIXELS.toLocaleString()} total pixels.`,
      413,
      'IMAGE_DIMENSIONS_TOO_LARGE',
    );
  }

  return metadata;
}

function isAnimatedImage(metadata) {
  return (metadata?.pages || 1) > MAX_IMAGE_FRAMES || Boolean(metadata?.animated);
}

function hasPdfSignature(buffer) {
  if (!Buffer.isBuffer(buffer) && !(buffer instanceof Uint8Array)) return false;
  return toStandaloneBuffer(buffer).subarray(0, 1024).includes(Buffer.from('%PDF-'));
}

module.exports = {
  MAX_PDF_PAGES,
  createClientError,
  getImageFormat,
  getImageMetadata,
  getImageSignature,
  hasPdfSignature,
  isAnimatedImage,
  toStandaloneBuffer,
  validateImageMetadata,
};
