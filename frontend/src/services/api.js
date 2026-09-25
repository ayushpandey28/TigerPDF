import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (
  import.meta.env.PROD
    ? 'https://tigerpdf.onrender.com/api'
    : 'http://localhost:5000/api'
);

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000,
});

export async function pingServer() {
  try {
    await api.get('/health', { timeout: 20000 });
  } catch (e) {
    // Silent fail on warm-up ping
  }
}

export async function getErrorMessage(err) {
  if (err.response) {
    const status = err.response.status;
    if (status === 413) {
      return 'The uploaded file is too large. Maximum size is 20 MB per file.';
    }
    if (status === 504 || status === 502) {
      return 'The server took too long to respond. The free-tier server may be waking up — please try again in a few moments.';
    }

    const data = err.response.data;
    if (data) {
      if (typeof data === 'object' && !(data instanceof Blob) && data.message) {
        return data.message;
      }
      if (data instanceof Blob) {
        try {
          const text = await data.text();
          const json = JSON.parse(text);
          if (json?.message) return json.message;
        } catch (e) {}
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

export function convertImageToPDF(files) {
  const formData = new FormData();
  files.forEach((file) => formData.append('images', file));
  return api.post('/image-to-pdf', formData, { responseType: 'blob' });
}

export function mergePDFs(files) {
  const formData = new FormData();
  files.forEach((file) => formData.append('pdfs', file));
  return api.post('/merge-pdf', formData, { responseType: 'blob' });
}

export function compressPDF(file, level = 'medium') {
  const formData = new FormData();
  formData.append('pdf', file);
  formData.append('level', level);
  return api.post('/compress-pdf', formData, { responseType: 'blob' });
}

export function compressImage(file, level = 'medium') {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('level', level);
  return api.post('/compress-image', formData, { responseType: 'blob' });
}

export default api;
