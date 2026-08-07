const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

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

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
