import axios from 'axios';

// Use production URL on Vercel, localhost in development
const API_BASE_URL = import.meta.env.PROD
  ? 'https://tigerpdf.onrender.com/api'
  : 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000,
});

// Pull error message from backend response when available (handles JSON or Blob responseType)
async function getErrorMessage(err) {
  if (err.response && err.response.data) {
    // If backend sent JSON with a message field
    if (err.response.data.message) {
      return err.response.data.message;
    }
    // If response is a Blob (from responseType: 'blob'), parse the JSON text from the Blob
    if (err.response.data instanceof Blob) {
      try {
        const text = await err.response.data.text();
        const json = JSON.parse(text);
        if (json && json.message) {
          return json.message;
        }
      } catch (e) {
        // Blob is not valid JSON
      }
    }
  }
  if (err.code === 'ECONNABORTED') {
    return 'Request timed out. The server may be waking up — please try again.';
  }
  if (err.message === 'Network Error') {
    return 'Cannot reach the server. Please check your connection and try again.';
  }
  return null;
}

// Convert images to PDF
export function convertImageToPDF(files) {
  const formData = new FormData();

  files.forEach((file) => {
    formData.append('images', file);
  });

  return api.post('/image-to-pdf', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    responseType: 'blob',
  });
}

// Merge multiple PDFs
export function mergePDFs(files) {
  const formData = new FormData();

  files.forEach((file) => {
    formData.append('pdfs', file);
  });

  return api.post('/merge-pdf', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    responseType: 'blob',
  });
}

// Compress a PDF
export function compressPDF(file, level) {
  const formData = new FormData();

  formData.append('pdf', file);
  formData.append('level', level || 'medium');

  return api.post('/compress-pdf', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    responseType: 'blob',
  });
}

// Compress an image
export function compressImage(file, level) {
  const formData = new FormData();

  formData.append('image', file);
  formData.append('level', level || 'medium');

  return api.post('/compress-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    responseType: 'blob',
  });
}

export { getErrorMessage };
export default api;