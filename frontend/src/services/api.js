import axios from 'axios';

// Allow deployments and previews to supply their backend without changing code.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (
  import.meta.env.PROD
    ? 'https://tigerpdf.onrender.com/api'
    : 'http://localhost:5000/api'
);

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000,
});

// Warm up free-tier backend (e.g. Render) in background
export async function pingServer() {
  try {
    await api.get('/health', { timeout: 20000 });
  } catch (e) {
    // Ignore ping failure; subsequent user actions will proceed normally
  }
}

// Pull error message from backend response when available (handles JSON, Blob, and proxy errors)
async function getErrorMessage(err) {
  if (err.response) {
    if (err.response.status === 413) {
      return 'The uploaded file is too large. Maximum size is 20 MB per file.';
    }
    if (err.response.status === 504 || err.response.status === 502) {
      return 'The server took too long to respond. The free-tier server may be waking up — please try again in a few moments.';
    }

    if (err.response.data) {
      // If backend sent JSON with a message field
      if (typeof err.response.data === 'object' && !(err.response.data instanceof Blob) && err.response.data.message) {
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

  // Let Axios and the browser automatically set the correct multipart/form-data boundary
  return api.post('/image-to-pdf', formData, {
    responseType: 'blob',
  });
}

// Merge multiple PDFs
export function mergePDFs(files) {
  const formData = new FormData();

  files.forEach((file) => {
    formData.append('pdfs', file);
  });

  // Let Axios and the browser automatically set the correct multipart/form-data boundary
  return api.post('/merge-pdf', formData, {
    responseType: 'blob',
  });
}

// Compress a PDF
export function compressPDF(file, level) {
  const formData = new FormData();

  formData.append('pdf', file);
  formData.append('level', level || 'medium');

  // Let Axios and the browser automatically set the correct multipart/form-data boundary
  return api.post('/compress-pdf', formData, {
    responseType: 'blob',
  });
}

// Compress an image
export function compressImage(file, level) {
  const formData = new FormData();

  formData.append('image', file);
  formData.append('level', level || 'medium');

  // Let Axios and the browser automatically set the correct multipart/form-data boundary
  return api.post('/compress-image', formData, {
    responseType: 'blob',
  });
}

export { getErrorMessage };
export default api;
