import axios from 'axios';

// Base URL for the backend API
const API_BASE_URL = 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

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
export function compressPDF(file) {
  const formData = new FormData();
  formData.append('pdf', file);

  return api.post('/compress-pdf', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    responseType: 'blob',
  });
}

// Compress an image
export function compressImage(file) {
  const formData = new FormData();
  formData.append('image', file);

  return api.post('/compress-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    responseType: 'blob',
  });
}

export default api;
