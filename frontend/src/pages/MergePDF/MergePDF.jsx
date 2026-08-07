import React, { useState } from 'react';
import UploadBox from '../../components/UploadBox/UploadBox';
import Loading from '../../components/Loading/Loading';
import DownloadButton from '../../components/DownloadButton/DownloadButton';
import { HiDocumentDuplicate, HiX } from 'react-icons/hi';
import { mergePDFs } from '../../services/api';
import './MergePDF.css';

function MergePDF() {
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

  // Merge PDFs
  async function handleMerge() {
    if (files.length < 2) {
      setError('Please select at least two PDF files.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await mergePDFs(files);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setResult(url);
    } catch (err) {
      setError('Something went wrong. Please try again.');
    }

    setLoading(false);
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-icon" style={{ background: 'linear-gradient(135deg, #06B6D4, #0891B2)' }}>
          <HiDocumentDuplicate size={28} />
        </div>
        <h1>Merge PDF</h1>
        <p>Combine multiple PDF files into one document.</p>
      </div>

      {/* Upload */}
      {!loading && !result && (
        <UploadBox
          accept=".pdf"
          multiple={true}
          onFilesSelected={handleFiles}
          label="Drag & drop your PDF files here"
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

          <button className="action-btn" onClick={handleMerge}>
            Merge PDFs
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && <Loading message="Merging your PDFs..." />}

      {/* Result */}
      {result && (
        <div className="result-box">
          <p className="result-text">✅ Your merged PDF is ready!</p>
          <DownloadButton fileUrl={result} fileName="merged.pdf" />
          <button className="reset-btn" onClick={() => { setFiles([]); setResult(null); }}>
            Merge More PDFs
          </button>
        </div>
      )}

      {/* Error */}
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}

export default MergePDF;
