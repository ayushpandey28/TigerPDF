const fs = require('fs');
const sharp = require('sharp');

// Compress image file
async function compressImage(req, res) {
  try {
    const file = req.file;

    // Check if file exists
    if (!file) {
      return res.status(400).json({ message: 'Please upload only one image.' });
    }

    let compressedBuffer;
    const format = file.mimetype;

    // Compress based on image format
    if (format === 'image/png') {
      compressedBuffer = await sharp(file.path)
        .png({ quality: 60, compressionLevel: 8 })
        .toBuffer();
    } else if (format === 'image/webp') {
      compressedBuffer = await sharp(file.path)
        .webp({ quality: 60 })
        .toBuffer();
    } else {
      // Default to JPEG format
      compressedBuffer = await sharp(file.path)
        .jpeg({ quality: 60 })
        .toBuffer();
    }

    // Clean up temporary file
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    // Send compressed image response
    res.setHeader('Content-Type', file.mimetype || 'image/jpeg');
    return res.send(compressedBuffer);
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(500).json({ message: 'Error compressing image file.' });
  }
}

module.exports = { compressImage };
