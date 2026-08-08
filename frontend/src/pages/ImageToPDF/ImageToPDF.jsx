import React, { useState } from 'react';
import UploadBox from '../../components/UploadBox/UploadBox';
import Loading from '../../components/Loading/Loading';
import DownloadButton from '../../components/DownloadButton/DownloadButton';
import { HiPhotograph, HiX } from 'react-icons/hi';
import { convertImageToPDF, getErrorMessage } from '../../services/api';
import './ImageToPDF.css';

function ImageToPDF() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  // Handle files selected
  function handleFiles(selected) {
    setFiles([...files, ...selected]);
    setResult(null);
    setError('');
  }

  // Remove a file from the list
  function removeFile(index) {
    const updated = files.filter((_, i) => i !== index);
    setFiles(updated);
  }

  // Convert images to PDF
  async function handleConvert() {
    if (files.length === 0) {
      setError('Please select at least one image.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await convertImageToPDF(files);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setResult(url);
    } catch (err) {
      const msg = getErrorMessage(err);
      setError(msg || 'Something went wrong. Please try again.');
    }

    setLoading(false);
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-icon" style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}>
          <HiPhotograph size={28} />
        </div>
        <h1>Image to PDF</h1>
        <p>Convert your images into a single PDF document.</p>
      </div>

      {/* Upload */}
      {!loading && !result && (
        <UploadBox
          accept="image/*"
          multiple={true}
          onFilesSelected={handleFiles}
          label="Drag & drop your images here"
        />
      )}

      {/* File List */}
      {files.length > 0 && !loading && !result && (
        <div className="file-list">
          {files.map((file, index) => (
            <div className="file-item" key={index}>
              <span className="file-name">{file.name}</span>
              <button className="file-remove" onClick={() => removeFile(index)}>
                <HiX />
              </button>
            </div>
          ))}

          <button className="action-btn" onClick={handleConvert}>
            Convert to PDF
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && <Loading message="Converting your images..." />}

      {/* Result */}
      {result && (
        <div className="result-box">
          <p className="result-text">✅ Your PDF is ready!</p>
          <DownloadButton fileUrl={result} fileName="converted.pdf" />
          <button className="reset-btn" onClick={() => { if (result) URL.revokeObjectURL(result); setFiles([]); setResult(null); }}>
            Convert More Images
          </button>
        </div>
      )}

      {/* Error */}
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}

export default ImageToPDF;
